/*
 * =========================================================================
 *  Signal Rack — AE binding/bake helper  (OPTIONAL TOOLING, NOT THE ENGINE)
 * =========================================================================
 *  The engine is shaders/signal_core.wgsl, exposed in AE by the Signal Rack
 *  PLUGIN. This ScriptUI panel is only convenience sugar AROUND that plugin:
 *    - Bind   : pick-whip a selected property to a rack's Output A/B/C param.
 *    - Chain  : pick-whip a rack's Input A/B/C to another rack's Output.
 *    - Bake   : sample a property over the work area -> keyframes, optionally
 *               detaching it from the live rack (the escape hatch).
 *
 *  It assumes each Signal Rack layer carries one effect named "Signal Rack"
 *  (the plugin) with params "Output A/B/C" and "Input A/B/C". It does NOT
 *  create signals — the plugin does. Nothing here is load-bearing at render.
 *
 *  STATUS: written to the documented AE ExtendScript DOM; not yet run in AE.
 * =========================================================================
 */
(function (thisObj) {
    var FX = "Signal Rack";   // the plugin's effect display name

    function activeComp() {
        var c = app.project.activeItem;
        if (!(c && c instanceof CompItem)) { alert("Open a composition first."); return null; }
        return c;
    }
    function selectedProp() {
        var c = activeComp(); if (!c) return null;
        var s = c.selectedProperties;
        if (!s || !s.length) { alert("Select a property in the timeline."); return null; }
        return s[s.length - 1];
    }
    function findRacks(comp) {
        var out = [];
        for (var i = 1; i <= comp.numLayers; i++) {
            var ly = comp.layer(i);
            try { if (ly.effect(FX)) out.push(ly); } catch (e) {}
        }
        return out;
    }
    function outRef(layer, ch) {
        return 'thisComp.layer("' + layer.name + '").effect("' + FX + '")("Output ' + ch + '")';
    }

    function bind(prop, rack, ch, targetSide, lo, hi) {
        if (!prop || !prop.canSetExpression) { alert("Pick a property that accepts expressions."); return; }
        if (prop.expression && prop.expression.length) {
            if (!confirm("Overwrite existing expression?\n\n" + prop.expression)) return;
        }
        app.beginUndoGroup("Signal Rack: Bind");
        var ref = outRef(rack, ch);
        prop.expression = targetSide
            ? ("s = " + ref + ";\nlinear(s, 0, 1, " + lo + ", " + hi + ")")
            : ref;
        app.endUndoGroup();
    }
    function chain(rackFrom, chFrom, rackInto, inLetter) {
        app.beginUndoGroup("Signal Rack: Chain");
        var inProp = rackInto.effect(FX)("Input " + inLetter);
        inProp.expression = "// sidechain <- " + rackFrom.name + " Output " + chFrom + "\n" + outRef(rackFrom, chFrom);
        app.endUndoGroup();
    }
    function bake(prop, detach) {
        var comp = activeComp(); if (!comp) return;
        if (!prop || !prop.canVaryOverTime) { alert("Select one keyframable property."); return; }
        app.beginUndoGroup("Signal Rack: Bake");
        var fd = comp.frameDuration, t0 = comp.workAreaStart, t1 = comp.workAreaStart + comp.workAreaDuration;
        var times = [], vals = [];
        for (var t = t0; t <= t1 + 1e-6; t += fd) { times.push(t); vals.push(prop.valueAtTime(t, false)); }
        if (prop.expression) prop.expressionEnabled = false;
        prop.setValuesAtTimes(times, vals);
        if (detach && prop.canSetExpression) prop.expression = "";
        app.endUndoGroup();
    }

    // ---- UI ----
    var pal = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Signal Rack — Bind/Bake");
    pal.alignChildren = "fill"; pal.margins = 10; pal.spacing = 6;

    var pB = pal.add("panel", undefined, "Bind selected property"); pB.alignChildren = "fill"; pB.margins = 8;
    var g1 = pB.add("group");
    g1.add("statictext", undefined, "Rack:"); var ddR = g1.add("dropdownlist", undefined, []);
    g1.add("statictext", undefined, "Out:"); var ddC = g1.add("dropdownlist", undefined, ["A","B","C"]); ddC.selection = 0;
    var g2 = pB.add("group");
    var rT = g2.add("checkbox", undefined, "target-side remap to");
    var lo = g2.add("edittext", undefined, "0"); lo.characters = 5;
    g2.add("statictext", undefined, "..");
    var hi = g2.add("edittext", undefined, "1"); hi.characters = 5;
    pB.add("button", undefined, "Bind").onClick = function () {
        var p = selectedProp(); if (!p || !ddR.selection) { alert("Select a property and a rack."); return; }
        bind(p, ddR.selection.rack, ddC.selection.text, rT.value, parseFloat(lo.text), parseFloat(hi.text));
    };

    var pC = pal.add("panel", undefined, "Chain (sidechain)"); pC.alignChildren = "fill"; pC.margins = 8;
    var g3 = pC.add("group");
    g3.add("statictext", undefined, "From"); var ddFr = g3.add("dropdownlist", undefined, []);
    g3.add("statictext", undefined, "Out"); var ddFc = g3.add("dropdownlist", undefined, ["A","B","C"]); ddFc.selection = 0;
    var g4 = pC.add("group");
    g4.add("statictext", undefined, "Into"); var ddIn = g4.add("dropdownlist", undefined, []);
    g4.add("statictext", undefined, "Input"); var ddIl = g4.add("dropdownlist", undefined, ["A","B","C"]); ddIl.selection = 0;
    pC.add("button", undefined, "Chain").onClick = function () {
        if (!ddFr.selection || !ddIn.selection) { alert("Pick both racks."); return; }
        chain(ddFr.selection.rack, ddFc.selection.text, ddIn.selection.rack, ddIl.selection.text);
    };

    var g5 = pal.add("group");
    g5.add("button", undefined, "Bake (keep)").onClick = function () { var p = selectedProp(); if (p) bake(p, false); };
    g5.add("button", undefined, "Bake + Detach").onClick = function () { var p = selectedProp(); if (p) bake(p, true); };
    pal.add("button", undefined, "Refresh racks").onClick = refresh;

    function refresh() {
        var c = app.project.activeItem;
        var racks = (c && c instanceof CompItem) ? findRacks(c) : [];
        var dds = [ddR, ddFr, ddIn];
        for (var d = 0; d < dds.length; d++) {
            dds[d].removeAll();
            for (var i = 0; i < racks.length; i++) { var it = dds[d].add("item", racks[i].name); it.rack = racks[i]; }
            if (racks.length) dds[d].selection = 0;
        }
    }
    refresh();

    if (pal instanceof Window) { pal.center(); pal.show(); } else { pal.layout.layout(true); }
})(this);
