// =============================================================================
//  SignalRackPlugin.cpp  — After Effects effect entry (SKELETON)
//
//  Thin AE consumer of the WGSL/Dawn engine. NOT YET BUILDABLE: needs the Adobe
//  After Effects SDK headers and a Dawn tree. This file documents the intended
//  structure (param order, render flow, the output-publishing path) so the next
//  engineer starts from the conventions, not a blank page.
//
//  IMPORTANT FEASIBILITY FINDING (see docs/ae-output-publishing.md):
//  An AE effect's params are INPUTS. Render() cannot reliably publish a live,
//  pick-whippable computed scalar back onto its own Output sliders during the
//  evaluation pass. The supported v1 coupling is therefore:
//    * LIVE  : a one-line expression on each Output slider bridges to the engine
//              (the AEGP companion evaluates and the expression reads a cached
//              value), OR the user previews via the guide layer the effect draws.
//    * BAKE  : the AEGP side writes engine values as keyframes onto the Output
//              sliders (fully supported, deterministic) — this is the robust path.
//  The WGSL/Dawn engine remains the single source of truth for computation
//  (probes, heavy DSP, and bake); AE is the host/exposure layer.
// =============================================================================

#include "AEConfig.h"
#include "AE_Effect.h"
#include "AE_EffectCB.h"
#include "AE_Macros.h"
#include "Param_Utils.h"

#include "backend/WebGpuBackend.h"
#include "plugins/after-effects/signalrack_bridge.h"

using namespace ItsAllNoise::SignalRack;

// One backend (device + runtime) per plugin instance lifetime.
static plugin::WebGpuBackend gBackend;

// --- parameter setup: order MUST match ae::ParamID -------------------------
static PF_Err ParamsSetup(PF_InData* in_data, PF_OutData* out_data) {
    PF_Err err = PF_Err_NONE;
    PF_ParamDef def;

    AEFX_CLR_STRUCT(def);
    PF_ADD_POPUP("Source Type", 7 /*choices*/, 1 /*dflt*/,
                 "Sine|Pulse|Ramp|Noise|Random Walk|Linked (Input A)|Luma Probe",
                 ae::kSourceType);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Rate (Hz)", 0, 30, 0, 6, 1, PF_Precision_TENTHS, 0, 0, ae::kRate);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Amount", 0, 4, 0, 2, 1, PF_Precision_HUNDREDTHS, 0, 0, ae::kAmount);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Phase", 0, 1, 0, 1, 0, PF_Precision_HUNDREDTHS, 0, 0, ae::kPhase);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Seed", 0, 99999, 0, 100, 1, PF_Precision_INTEGER, 0, 0, ae::kSeed);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Offset", -1, 1, -1, 1, 0, PF_Precision_HUNDREDTHS, 0, 0, ae::kOffset);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Smooth", 0, 1, 0, 1, 0, PF_Precision_HUNDREDTHS, 0, 0, ae::kSmooth);

    // Inputs (sidechain): plain sliders the user pick-whips INTO.
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Input A", -10000, 10000, -1, 1, 0, PF_Precision_THOUSANDTHS, 0, 0, ae::kInputA);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Input B", -10000, 10000, -1, 1, 0, PF_Precision_THOUSANDTHS, 0, 0, ae::kInputB);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Input C", -10000, 10000, -1, 1, 0, PF_Precision_THOUSANDTHS, 0, 0, ae::kInputC);

    // Luma probe.
    AEFX_CLR_STRUCT(def); PF_ADD_POINT("Probe Point", 50, 50, 0, ae::kProbePoint);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Probe Radius", 0.5, 16, 0.5, 8, 0.5, PF_Precision_TENTHS, 0, 0, ae::kProbeRadius);

    // Output modes + ranges.
    const char* modes = "Normalized 0..1|Signed -1..1|Percentage|Degrees|Pixels|Custom|Gate|Trigger";
    AEFX_CLR_STRUCT(def); PF_ADD_POPUP("Output A Mode", 8, 1, modes, ae::kOutAMode);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output A Min", -10000, 10000, -100, 100, 0, PF_Precision_HUNDREDTHS, 0, 0, ae::kOutAMin);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output A Max", -10000, 10000, -100, 100, 1, PF_Precision_HUNDREDTHS, 0, 0, ae::kOutAMax);
    AEFX_CLR_STRUCT(def); PF_ADD_POPUP("Output B Mode", 8, 4, modes, ae::kOutBMode);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output B Min", -10000, 10000, -100, 100, -15, PF_Precision_HUNDREDTHS, 0, 0, ae::kOutBMin);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output B Max", -10000, 10000, -100, 100, 15, PF_Precision_HUNDREDTHS, 0, 0, ae::kOutBMax);
    AEFX_CLR_STRUCT(def); PF_ADD_POPUP("Output C Mode", 8, 7, modes, ae::kOutCMode);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output C Min", -10000, 10000, -100, 100, 0, PF_Precision_HUNDREDTHS, 0, 0, ae::kOutCMin);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output C Max", -10000, 10000, -100, 100, 1, PF_Precision_HUNDREDTHS, 0, 0, ae::kOutCMax);

    // Output sliders (pick-whipped FROM). See feasibility note in the header:
    // these are populated via expression-bridge (live) or AEGP keyframes (bake).
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output A", -100000, 100000, -1, 1, 0, PF_Precision_THOUSANDTHS, 0, 0, ae::kOutputA);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output B", -100000, 100000, -1, 1, 0, PF_Precision_THOUSANDTHS, 0, 0, ae::kOutputB);
    AEFX_CLR_STRUCT(def); PF_ADD_FLOAT_SLIDERX("Output C", -100000, 100000, -1, 1, 0, PF_Precision_THOUSANDTHS, 0, 0, ae::kOutputC);

    out_data->num_params = ae::kNumParams;
    return err;
}

// Read the AE param stream into the CPU-testable snapshot (translation lives in
// signalrack_bridge.h so it can be unit-tested without AE).
static ae::ParamSnapshot ReadParams(PF_ParamDef* params[]) {
    ae::ParamSnapshot s;
    s.sourceType = (uint32_t)params[ae::kSourceType]->u.pd.value;
    s.rate   = params[ae::kRate]->u.fs_d.value;
    s.amount = params[ae::kAmount]->u.fs_d.value;
    s.phase  = params[ae::kPhase]->u.fs_d.value;
    s.seed   = (uint32_t)params[ae::kSeed]->u.fs_d.value;
    s.offset = params[ae::kOffset]->u.fs_d.value;
    s.smooth = params[ae::kSmooth]->u.fs_d.value;
    s.inputA = params[ae::kInputA]->u.fs_d.value;
    s.probeX = (float)params[ae::kProbePoint]->u.td.x_value / 65536.0f;
    s.probeY = (float)params[ae::kProbePoint]->u.td.y_value / 65536.0f;
    s.probeRadius = params[ae::kProbeRadius]->u.fs_d.value;
    s.outAMode = (uint32_t)params[ae::kOutAMode]->u.pd.value; s.outAMin = params[ae::kOutAMin]->u.fs_d.value; s.outAMax = params[ae::kOutAMax]->u.fs_d.value;
    s.outBMode = (uint32_t)params[ae::kOutBMode]->u.pd.value; s.outBMin = params[ae::kOutBMin]->u.fs_d.value; s.outBMax = params[ae::kOutBMax]->u.fs_d.value;
    s.outCMode = (uint32_t)params[ae::kOutCMode]->u.pd.value; s.outCMin = params[ae::kOutCMin]->u.fs_d.value; s.outCMax = params[ae::kOutCMax]->u.fs_d.value;
    return s;
}

// Render: evaluate the engine for THIS frame and draw the guide visualization.
// (Driving downstream properties happens via the expression bridge / bake — see
// the feasibility note; Render() itself does not publish pick-whippable values.)
static PF_Err Render(PF_InData* in_data, PF_OutData* out_data,
                     PF_ParamDef* params[], PF_LayerDef* output) {
    PF_Err err = PF_Err_NONE;

    ae::ParamSnapshot snap = ReadParams(params);
    SignalRecipe recipe = ae::MapParamsToRecipe(snap, /*rackId=*/"sg_ae");

    plugin::PluginRenderRequest req;
    req.recipe = recipe;
    req.startTime = (float)in_data->current_time / (float)in_data->time_scale;
    req.dt = (float)in_data->time_step / (float)in_data->time_scale;
    req.frameDuration = req.dt;
    req.sampleCount = 1;                 // current frame
    req.resolvedInputA = snap.inputA;    // sidechain already resolved by AE's expr
    // TODO(LumaProbe): sample the source layer here and pass per-sample luma.

    SignalOutputs ev;
    std::string message;
    if (gBackend.Evaluate(req, &ev, &message)) {
        // ev.current().a / .b / .c are this frame's interpreted scalar outputs.
        // TODO: render a guide waveform/value readout into `output` from `ev`.
        (void)output;
    } else {
        // No CPU fallback. Surface the error to AE.
        PF_SPRINTF(out_data->return_msg, "Signal Rack: %s", message.c_str());
        err = PF_Err_NONE;  // non-fatal: show message, render passthrough
    }
    return err;
}

// --- AE entry point --------------------------------------------------------
extern "C" DllExport PF_Err EffectMain(PF_Cmd cmd, PF_InData* in_data, PF_OutData* out_data,
                                       PF_ParamDef* params[], PF_LayerDef* output, void* extra) {
    PF_Err err = PF_Err_NONE;
    switch (cmd) {
        case PF_Cmd_GLOBAL_SETUP:
            out_data->my_version = PF_VERSION(0, 1, 0, PF_Stage_DEVELOP, 0);
            out_data->out_flags = PF_OutFlag_DEEP_COLOR_AWARE;
            gBackend.WarmUpAsync();   // create the Dawn device off the hot path
            break;
        case PF_Cmd_PARAMS_SETUP:
            err = ParamsSetup(in_data, out_data);
            break;
        case PF_Cmd_RENDER:
            err = Render(in_data, out_data, params, output);
            break;
        default:
            break;
    }
    return err;
}
