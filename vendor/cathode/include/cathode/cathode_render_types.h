#pragma once

#include "ae_bridge/shared/types.h"
#include "cathode/cathode_surface_roles.h"
#include "cathode/render_graph.h"

#include <cstdint>

namespace cathode {

using CathodeSurfaceViews = CathodeSurfaceBundleT<ae_bridge::ConstImageView>;

enum class SourceInputMode : std::uint32_t {
    AppliedLayer = 0,
    LayerOverride = 1,
};

enum class CathodePresetFlavor : std::uint32_t {
    Custom = 0,
    BroadcastCrt = 1,
    ConsumerCrt = 2,
    TubeCamcorderViewfinder = 3,
    SvhsTape = 4,
    BetacamSpMonitor = 5,
    BinocularVisorHud = 6,
    BroadcastCrtStudioWarm = 7,
    ConsumerCrtBigBox = 8,
    ConsumerCrtLateNightCable = 9,
    TubeCamcorderViewfinderBoosted = 10,
    TubeCamcorderViewfinderWorn = 11,
    SvhsTapeRentalCopy = 12,
    SvhsTapeTrackingGone = 13,
    BetacamSpMonitorHotFeed = 14,
    BroadcastCrtControlRoom = 15,
    ConsumerCrtWoodgrainLivingRoom = 16,
    ConsumerCrtSaturdayMorning = 17,
    TubeCamcorderViewfinderGhostTrail = 18,
    TubeCamcorderViewfinderOvercranked = 19,
    SvhsTapeEpDub = 20,
    SvhsTapeSixthGenDub = 21,
    BetacamSpMonitorMasterControl = 22,
};

enum class DisplayMaskMode : std::uint32_t {
    ApertureGrille = 0,
    ShadowMask = 1,
    SlotMask = 2,
};

enum class DisplayPhosphorMode : std::uint32_t {
    NtscColor = 0,
    BlackAndWhite = 1,
    Green = 2,
    Amber = 3,
    Blue = 4,
    White = 5,
};

enum class SignalFlavor : std::uint32_t {
    Composite = 0,
    ComponentMonitor = 1,
};

struct CathodeInputFrames {
    ae_bridge::ConstImageView appliedSource = {};
    ae_bridge::ConstImageView sourceOverride = {};
    ae_bridge::ConstImageView externalLuma = {};
    ae_bridge::ConstImageView displayMask = {};
    ae_bridge::ConstImageView sensorHistory = {};
    ae_bridge::ConstImageView signalHistory = {};
    ae_bridge::ConstImageView transportHistory = {};
    ae_bridge::ConstImageView displayHistory = {};
};

struct CathodeParams {
    CathodePresetFlavor preset = CathodePresetFlavor::BroadcastCrt;
    SourceInputMode sourceInputMode = SourceInputMode::AppliedLayer;
    TemporalMode temporalMode = TemporalMode::Deterministic;
    DisplayMaskMode displayMaskMode = DisplayMaskMode::ApertureGrille;
    DisplayPhosphorMode displayPhosphorMode = DisplayPhosphorMode::NtscColor;
    float displayAmount = 0.92f;
    float beamSharpness = 0.9f;
    float maskStrength = 0.9f;
    float bloomAmount = 0.2f;
    float scanlineStrength = 0.84f;
    float scanlineDensity = 0.58f;
    float scanlineSoftness = 0.42f;
    float displayPixelSize = 1.0f;
    float displayPersistence = 0.18f;
    float displayCurvature = 0.1f;
    SignalFlavor signalFlavor = SignalFlavor::Composite;
    float compositeBandwidth = 0.62f;
    float dotCrawlStrength = 0.2f;
    float chromaLag = 0.0f;
    float chromaNoise = 0.0f;
    float lagStrength = 0.24f;
    float ccdSmearAmount = 0.14f;
    float rollingShutterAmount = 0.08f;
    float timebaseJitter = 0.0f;
    float headSwitchingAmount = 0.0f;
    float trackingError = 0.0f;
    float dropoutAmount = 0.0f;
    float trackingBandWidth = 0.0f;
    float trackingDriftRate = 0.0f;
    float trackingJumpAmount = 0.0f;
    float jitterRate = 0.0f;
    float dropoutDensity = 0.0f;
    float dropoutLength = 0.0f;
    float syncRollAmount = 0.0f;
    float syncTearAmount = 0.0f;
    float wowFlutterAmount = 0.0f;
    float wowFlutterRate = 0.0f;
    float analogGlitchAmount = 0.0f;
    float analogGlitchFrequency = 0.35f;
    float chromaSmearAmount = 0.0f;
    float chromaSmearWidth = 0.35f;
    float signalClipAmount = 0.0f;
    float signalRingingAmount = 0.0f;
    float hueDriftAmount = 0.0f;
    float hueDriftRate = 0.35f;
    float rfInterferenceAmount = 0.0f;
    float rfInterferenceFrequency = 0.35f;
    float humBarAmount = 0.0f;
    float humBarRate = 0.35f;
    float digitalGlitchAmount = 0.0f;
    float digitalBlockSize = 0.35f;
    float macroblockAmount = 0.0f;
    float macroblockSize = 0.35f;
    float posterizeBits = 8.0f;
    float mosquitoNoiseAmount = 0.0f;
    float mosquitoNoiseRadius = 0.35f;
    float sparkleDensity = 0.0f;
    float digitalDropoutDensity = 0.0f;
    float digitalDropoutSize = 0.35f;
    float digitalConcealmentHistoryBlend = 0.0f;
    float printThroughAmount = 0.0f;
    float printThroughOffset = 0.35f;
    float ghostTrailAmount = 0.0f;
    float ghostTrailDecay = 0.35f;
    float frameHoldProbability = 0.0f;
    float frameRepeatCount = 0.0f;
    float outputMix = 1.0f;
    bool enableSensor = true;
    bool enableSignal = true;
    bool enableTransport = true;
    bool enableDisplay = true;
};

struct CathodeRenderRequest {
    ae_bridge::ConstImageView input = {};
    CathodeInputFrames inputs = {};
    double timeSeconds = 0.0;
    double timeStepSeconds = 0.0;
    std::uint64_t frameIndex = 0;
    CathodeParams params = {};
};

}  // namespace cathode
