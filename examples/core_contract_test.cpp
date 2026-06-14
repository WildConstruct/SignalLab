#include "signalrack/signal_recipe.h"
#include "signalrack/signal_output.h"
#include "core/signal_runtime_config.h"
#include "core/signal_moniker.h"
#include "plugins/after-effects/signalrack_bridge.h"
#include <cassert>
#include <cstdio>
using namespace ItsAllNoise::SignalRack;
int main(){
  // Recipe -> Moniker
  SignalRecipe r; r.id="sg_pulse_001"; r.name="Pulse Driver";
  r.source.type=SourceType::Pulse; r.source.rate=2.0f;
  r.outputA={"Scale Pulse",OutputMode::Percentage,90,110,"percent","percentage"};
  auto name = SuggestName(r);
  assert(name == "SR \xc2\xb7 Pulse Driver");

  // Recipe -> CompiledSignalConfig parity with WGSL layout
  r.process.gain=1.5f; r.process.gate=0.6f; r.process.lag=0.4f; r.process.invert=true;
  r.process.modTarget=1; r.process.modDepth=0.8f; r.process.warp=-0.5f; r.process.fold=0.7f; r.process.sat=0.55f;
  auto c = Compile(r, 0.0f, 1.0f/30, 1.0f/30, 30, 0.0f);
  assert(c.byteSize()==144);
  assert(c.params[CompiledSignalConfig::SrcType]==2.0f);     // Pulse
  assert(c.params[CompiledSignalConfig::Rate]==2.0f);
  assert(c.params[CompiledSignalConfig::SampleN]==30.0f);
  assert(c.params[CompiledSignalConfig::ModeA]==3.0f);       // Percentage
  assert(c.params[CompiledSignalConfig::MaxA]==110.0f);
  assert(c.params[CompiledSignalConfig::PGain]==1.5f);       // processor moved into engine
  assert(c.params[CompiledSignalConfig::PGate]==0.6f);
  assert(c.params[CompiledSignalConfig::PLag]==0.4f);
  assert(c.params[CompiledSignalConfig::PInvert]==1.0f);
  assert(c.params[CompiledSignalConfig::ModTarget]==1.0f);
  assert(c.params[CompiledSignalConfig::ModDepth]==0.8f);
  assert(c.params[CompiledSignalConfig::PWarp]==-0.5f);
  assert(c.params[CompiledSignalConfig::PFold]==0.7f);
  assert(c.params[CompiledSignalConfig::PSat]==0.55f);

  // AE param snapshot -> recipe
  ae::ParamSnapshot s; s.sourceType=2; s.rate=2.0f; s.outAMode=3; s.outAMax=110;
  auto r2 = ae::MapParamsToRecipe(s, "sg_ae_1");
  assert(r2.source.type==SourceType::Pulse);
  assert(r2.outputA.mode==OutputMode::Percentage);
  assert(r2.outputA.max==110.0f);

  // sample contract
  SignalOutputs o; o.samples.push_back({0.5f,100.0f,0.5f,1.0f});
  assert(o.current().a==100.0f);
  std::printf("core contract OK — name='%s', config floats=%d\n", name.c_str(), CompiledSignalConfig::kFloatCount);
  return 0;
}
