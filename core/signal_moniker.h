// =============================================================================
//  core/signal_moniker.h
//  Naming path: SignalRecipe -> Moniker -> suggested name.
//
//  Mirrors the Etheros "naming path" (FieldRecipe or host state -> Moniker ->
//  suggested name). A Moniker turns a recipe's salient traits into a short,
//  human, deterministic label so racks self-name ("SR · Pulse Driver") instead
//  of "Null 7". Pure / header-only / testable.
// =============================================================================
#ifndef SIGNALRACK_CORE_SIGNAL_MONIKER_H
#define SIGNALRACK_CORE_SIGNAL_MONIKER_H

#include <string>

#include "signalrack/signal_recipe.h"

namespace ItsAllNoise {
namespace SignalRack {

inline const char* SourceWord(SourceType t) {
    switch (t) {
        case SourceType::Sine:       return "Sine";
        case SourceType::Pulse:      return "Pulse";
        case SourceType::Ramp:       return "Ramp";
        case SourceType::Noise:      return "Noise";
        case SourceType::RandomWalk: return "Walk";
        case SourceType::Linked:     return "Linked";
        case SourceType::LumaProbe:  return "Luma";
    }
    return "Signal";
}

// Deterministic suggested layer name. Prefers the recipe's explicit name, then
// falls back to a source-derived Moniker with the short id for uniqueness.
inline std::string SuggestName(const SignalRecipe& r) {
    if (!r.name.empty() && r.name != "Untitled Rack") {
        return "SR \xc2\xb7 " + r.name;  // "SR · <name>"
    }
    return std::string("SR \xc2\xb7 ") + SourceWord(r.source.type) + " [" + r.id + "]";
}

}  // namespace SignalRack
}  // namespace ItsAllNoise

#endif  // SIGNALRACK_CORE_SIGNAL_MONIKER_H
