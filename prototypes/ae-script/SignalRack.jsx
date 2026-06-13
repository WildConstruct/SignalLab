/*
 * =========================================================================
 *  SIGNAL RACK — After Effects prototype builder (ExtendScript / .jsx)
 * =========================================================================
 *  Wild Construct — Signal Rack proof of concept.
 *
 *  WHAT THIS IS
 *  ------------
 *  A single ScriptUI panel script that proves the Signal Rack workflow with
 *  100% AE-native objects (Expression Controls + expressions). No native
 *  plugin, no CEP, no UXP. Run it from File > Scripts > Run Script File...,
 *  or drop it in the ScriptUI Panels folder to dock it.
 *
 *  WHAT IT DOES
 *  ------------
 *   - "New Rack"      : builds a Signal Rack control layer (3 inputs, 3
 *                       outputs, source + process controls, output profiles).
 *   - "Bind Output"   : pick-whip helper. Select a target property, choose a
 *                       rack + output, and it writes a readable expression
 *                       that drives the target (output-side OR target-side
 *                       remap).
 *   - "Chain Racks"   : links Rack B's Input A to Rack A's Output A
 *                       (sidechain) without a node graph.
 *   - "Add Scope"     : adds a guide-layer waveform / value / gate display.
 *   - "Bake"          : samples a property over the work area and writes
 *                       keyframes, optionally removing the live expression.
 *
 *  STATUS / TESTING NOTE
 *  ---------------------
 *  Authored against the documented AE ExtendScript DOM and expression
 *  language. The DOM calls used (addProperty, setValue, setPropertyParameters
 *  for dropdown items, expression, setValueAtTime, comp.workAreaStart) are
 *  stable and long-standing. setPropertyParameters (custom dropdown items)
 *  requires AE 2020 (17.0)+. Where a call is version-sensitive it is guarded.
 *  This file has NOT been executed inside AE in this environment — see
 *  /tests for the manual verification checklist.
 * =========================================================================
 */

(function signalRack(thisObj){

    // ---- constants --------------------------------------------------------
    var SR = {
        version: "0.1.0",
        layerPrefix: "SR · ",           // "SR · "
        sourceTypes: ["Sine","Pulse","Ramp","Noise","Random Walk","Linked (Input A)","Luma Probe"],
        outputModes: ["Normalized 0..1","Signed -1..1","Percentage","Degrees","Pixels","Custom range","Gate","Trigger"],
        // sensible default [min,max] per output mode (index aligns with outputModes)
        modeDefaults: [ [0,1], [-1,1], [0,100], [-15,15], [-100,100], [0,1], [0,1], [0,1] ]
    };

    // The signal engine expression (kept in sync with
    // prototypes/ae-expressions/signal-engine.jsx). {CH} is substituted.
    var ENGINE = [
        "var R = thisLayer;",
        "function eff(n){ try { return R.effect(n); } catch (e) { return null; } }",
        "function num(n, prop, def){ var e = eff(n); return (e !== null) ? e(prop) : def; }",
        "var srcType = num('SR | Source Type','Menu',1);",
        "var rate = num('SR | Rate','Slider',1);",
        "var amount = num('SR | Amount','Slider',1);",
        "var phase = num('SR | Phase','Slider',0);",
        "var seed = num('SR | Seed','Slider',1);",
        "var offset = num('SR | Offset','Slider',0);",
        "var smooth = num('SR | Smooth','Slider',0);",
        "var inA = num('SR | Input A','Slider',0);",
        "var TWO_PI = Math.PI*2; seedRandom(seed, true);",
        "function srcUni(tt){",
        "  if (srcType==6){ return clamp(inA,0,1); }",
        "  if (srcType==7){",
        "    var L=eff('SR | Probe Source'), P=eff('SR | Probe Point');",
        "    var rad=num('SR | Probe Radius','Slider',0.5);",
        "    try { var lyr=L('Layer');",
        "      if (lyr && lyr.index!=thisLayer.index){",
        "        var col=lyr.sampleImage(P('Point'),[rad,rad],true,tt);",
        "        var lum=0.299*col[0]+0.587*col[1]+0.114*col[2];",
        "        return clamp(lum+offset,0,1);",
        "      } } catch(e){}",
        "    return 0;",
        "  }",
        "  var x=tt*rate+phase; var bp;",
        "  if (srcType==1){ bp=Math.sin(x*TWO_PI); }",
        "  else if (srcType==2){ bp=((x-Math.floor(x))<0.5)?1:-1; }",
        "  else if (srcType==3){ bp=(x-Math.floor(x))*2-1; }",
        "  else if (srcType==4){ bp=noise(x+seed*0.123); }",
        "  else if (srcType==5){ var sum=0,amp=1,fr=1,norm=0; for(var o=0;o<4;o++){ sum+=amp*noise(x*fr+seed+o*7.7); norm+=amp; amp*=0.5; fr*=2.0; } bp=sum/norm; }",
        "  else { bp=0; }",
        "  bp*=amount; return (bp+1)/2+offset;",
        "}",
        "function smoothed(tt){",
        "  if (smooth<=0) return srcUni(tt);",
        "  var win=smooth*0.5; var N=Math.round(clamp(smooth*24,1,24)); var acc=0;",
        "  for (var i=0;i<N;i++){ var f=(N==1)?0:(i/(N-1)); acc+=srcUni(tt-win*f); }",
        "  return acc/N;",
        "}",
        "var n = clamp(smoothed(time),0,1);",
        "var mode = num('SR | Output {CH} Mode','Menu',1);",
        "var mn = num('SR | Output {CH} Min','Slider',0);",
        "var mx = num('SR | Output {CH} Max','Slider',1);",
        "var out;",
        "if (mode==7){ out=(n>=0.5)?mx:mn; }",
        "else if (mode==8){ var fd=thisComp.frameDuration; var pulseFrames=3; var fired=0;",
        "  for (var k=1;k<=pulseFrames;k++){ var a=srcUni(time-k*fd)>=0.5; var b=srcUni(time-(k-1)*fd)>=0.5; if (b&&!a){ fired=1; break; } }",
        "  out = fired?mx:mn; }",
        "else { out = linear(n,0,1,mn,mx); }",
        "out"
    ].join("\n");

    // ---- small helpers ----------------------------------------------------
    function genId(){ return "" + Math.floor(Date.now() % 100000); }

    function addExprControl(layer, type, name){
        var fx = layer.property("ADBE Effect Parade").addProperty(type);
        fx.name = name;
        return fx;
    }

    function setSlider(fx, val){ fx.property("ADBE Slider Control-0001").setValue(val); }
    function sliderProp(fx){ return fx.property("ADBE Slider Control-0001"); }

    // Custom dropdown items (AE 2020+). Falls back to a plain slider label note.
    function addDropdown(layer, name, items, defaultIndex){
        try {
            var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Dropdown Control");
            fx.name = name;
            var menu = fx.property(1); // the menu property
            if (menu.setPropertyParameters) { menu.setPropertyParameters(items); }
            menu.setValue(defaultIndex || 1);
            return fx;
        } catch (e) {
            // Fallback: a slider acting as an index (pre-2020). Document in UI.
            var fxs = addExprControl(layer, "ADBE Slider Control", name + " (idx)");
            setSlider(fxs, defaultIndex || 1);
            return fxs;
        }
    }

    // ---- build a Signal Rack ---------------------------------------------
    function buildRack(comp, nickname){
        app.beginUndoGroup("Signal Rack: New Rack");
        var id = genId();
        var name = SR.layerPrefix + (nickname || "Rack") + " [id:" + id + "]";

        // A null is a clean, lightweight host for the controls.
        var layer = comp.layers.addNull(comp.duration);
        layer.name = name;
        layer.enabled = false;          // null video off; controls still evaluate
        layer.label = 9;                // green-ish label so racks are easy to spot

        // marker carrying machine-readable identity (survives renames better)
        var mk = new MarkerValue("signal-rack");
        mk.comment = "signal-rack id:" + id + " v:" + SR.version;
        layer.property("ADBE Marker").setValueAtTime(0, mk);

        // --- source + process controls ---
        addDropdown(layer, "SR | Source Type", SR.sourceTypes, 1);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Rate"),   1);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Amount"), 1);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Phase"),  0);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Seed"),   1);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Offset"), 0);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Smooth"), 0);

        // --- luma probe controls (always present so the engine never throws) ---
        addExprControl(layer, "ADBE Layer Control", "SR | Probe Source");
        addExprControl(layer, "ADBE Point Control", "SR | Probe Point");
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Probe Radius"), 0.5);

        // --- inputs (plain sliders; user pick-whips INTO these to chain) ---
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Input A"), 0);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Input B"), 0);
        setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Input C"), 0);

        // --- per-output: Mode + Min + Max + the driven Output slider ---
        var defaults = { A:1, B:4, C:7 };   // A Normalized, B Degrees, C Gate
        var chans = ["A","B","C"];
        for (var i = 0; i < chans.length; i++){
            var ch = chans[i];
            var modeIdx = defaults[ch];
            var rng = SR.modeDefaults[modeIdx - 1];
            addDropdown(layer, "SR | Output " + ch + " Mode", SR.outputModes, modeIdx);
            setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Output " + ch + " Min"), rng[0]);
            setSlider(addExprControl(layer, "ADBE Slider Control", "SR | Output " + ch + " Max"), rng[1]);
            var outFx = addExprControl(layer, "ADBE Slider Control", "SR | Output " + ch);
            sliderProp(outFx).expression = ENGINE.replace(/\{CH\}/g, ch);
        }

        app.endUndoGroup();
        return layer;
    }

    // ---- bind: write an expression on a target property -------------------
    // mode: "output" (rack already mapped) or "target" (remap on target side)
    function bindTarget(prop, rackLayer, ch, mode, tMin, tMax){
        if (!prop || !prop.canSetExpression){
            alert("Select a single property that accepts expressions first.");
            return;
        }
        if (prop.expression && prop.expression.length > 0){
            if (!confirm("This property already has an expression:\n\n" + prop.expression +
                         "\n\nOverwrite it?")) return;
        }
        app.beginUndoGroup("Signal Rack: Bind Output " + ch);
        var ref = "thisComp.layer(\"" + rackLayer.name + "\").effect(\"SR | Output " + ch + "\")(\"Slider\")";
        var expr;
        if (mode === "target"){
            expr = "// Signal Rack target-side remap (output is Normalized 0..1)\n" +
                   "s = " + ref + ";\n" +
                   "linear(s, 0, 1, " + tMin + ", " + tMax + ")";
        } else {
            expr = "// Signal Rack output-side value (range set on the rack)\n" + ref;
        }
        prop.expression = expr;
        app.endUndoGroup();
    }

    // ---- chain: link rack B Input A to rack A Output A --------------------
    function chainRacks(rackA, rackB, srcCh, dstInput){
        app.beginUndoGroup("Signal Rack: Chain");
        var inFx = rackB.effect("SR | Input " + dstInput);
        var ref = "thisComp.layer(\"" + rackA.name + "\").effect(\"SR | Output " + srcCh + "\")(\"Slider\")";
        sliderProp(inFx).expression = "// Sidechain <- " + rackA.name + " Output " + srcCh + "\n" + ref;
        app.endUndoGroup();
    }

    // ---- scope: guide-layer visualization --------------------------------
    // Draws a shape-layer waveform strip + numeric readout for Output A. Set
    // to a Guide layer so it is excluded from final render.
    function addScope(comp, rackLayer){
        app.beginUndoGroup("Signal Rack: Add Scope");
        var w = 480, h = 120, samples = 96;
        var scope = comp.layers.addShape();
        scope.name = "SR-SCOPE · " + rackLayer.name;
        scope.guideLayer = true;        // <-- excluded from final render, visible in viewer

        // a polyline path driven by an expression that samples Output A back in time
        var grp = scope.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        grp.name = "Waveform";
        var path = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Group");
        var stroke = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Stroke");
        stroke.property("ADBE Vector Stroke Color").setValue([0.2,1,0.5,1]);
        stroke.property("ADBE Vector Stroke Width").setValue(2);

        // The path expression scrolls a window of the rack's Output A signal.
        // It reads the rack's Output A normalized engine by re-evaluating the
        // SOURCE (cheap) rather than the output slider, to avoid range scaling.
        var pathExpr = [
            "var W=" + w + ", H=" + h + ", N=" + samples + ";",
            "var rackName=\"" + rackLayer.name + "\";",
            "var L=thisComp.layer(rackName);",
            "var span=2.0;                 // seconds shown",
            "var pts=[];",
            "for (var i=0;i<N;i++){",
            "  var f=i/(N-1);",
            "  var t=time - span*(1-f);",
            "  var v=L.effect('SR | Output A')('Slider').valueAtTime(t);",
            "  var mn=L.effect('SR | Output A Min')('Slider'); var mx=L.effect('SR | Output A Max')('Slider');",
            "  var nv=(mx==mn)?0:clamp((v-mn)/(mx-mn),0,1);",
            "  pts.push([f*W - W/2, (0.5-nv)*H]);",
            "}",
            "createPath(pts, [], [], false);"
        ].join("\n");
        path.property("ADBE Vector Shape").expression = pathExpr;

        // numeric current-value readout
        var txt = comp.layers.addText("");
        txt.name = "SR-VALUE · " + rackLayer.name;
        txt.guideLayer = true;
        txt.property("ADBE Transform Group").property("ADBE Position").setValue([60, 60]);
        var srcText = txt.property("ADBE Text Properties").property("ADBE Text Document");
        srcText.expression = [
            "var L=thisComp.layer(\"" + rackLayer.name + "\");",
            "var a=L.effect('SR | Output A')('Slider').value;",
            "var b=L.effect('SR | Output B')('Slider').value;",
            "var c=L.effect('SR | Output C')('Slider').value;",
            "'A '+a.toFixed(3)+'   B '+b.toFixed(2)+'   C '+(c>=0.5?'GATE':'-');"
        ].join("\n");

        app.endUndoGroup();
        return scope;
    }

    // ---- bake: sample a property over the work area -> keyframes ----------
    function bakeProperty(prop, removeExpression){
        if (!prop || !prop.canVaryOverTime){
            alert("Select one keyframable property to bake."); return;
        }
        var comp = app.project.activeItem;
        if (!(comp && comp instanceof CompItem)){ alert("Open a comp."); return; }
        app.beginUndoGroup("Signal Rack: Bake");
        var fd = comp.frameDuration;
        var start = comp.workAreaStart;
        var end = comp.workAreaStart + comp.workAreaDuration;
        var times = [], vals = [];
        for (var t = start; t <= end + 1e-6; t += fd){
            times.push(t);
            vals.push(prop.valueAtTime(t, false));
        }
        if (prop.expression) prop.expressionEnabled = false; // keep text, stop evaluating
        prop.setValuesAtTimes(times, vals);
        if (removeExpression && prop.canSetExpression) prop.expression = "";
        app.endUndoGroup();
    }

    // ---- collect racks in active comp ------------------------------------
    function findRacks(comp){
        var out = [];
        for (var i = 1; i <= comp.numLayers; i++){
            var ly = comp.layer(i);
            if (ly.name.indexOf("SR ·") === 0 && ly.effect("SR | Output A")) out.push(ly);
        }
        return out;
    }
    function activeComp(){
        var c = app.project.activeItem;
        if (!(c && c instanceof CompItem)){ alert("Open a composition first."); return null; }
        return c;
    }
    function selectedProp(){
        var c = activeComp(); if (!c) return null;
        var sel = c.selectedProperties;
        if (!sel || sel.length === 0){ alert("Select a property in the timeline."); return null; }
        return sel[sel.length - 1];
    }

    // ---- UI ---------------------------------------------------------------
    function buildUI(thisObj){
        var pal = (thisObj instanceof Panel) ? thisObj
                 : new Window("palette", "Signal Rack " + SR.version, undefined, {resizeable:true});
        pal.alignChildren = "fill";
        pal.spacing = 6; pal.margins = 10;

        // New rack
        var g1 = pal.add("group"); g1.add("statictext", undefined, "Nickname:");
        var nick = g1.add("edittext", undefined, "Pulse Driver"); nick.characters = 16;
        pal.add("button", undefined, "New Rack").onClick = function(){
            var c = activeComp(); if (!c) return;
            var ly = buildRack(c, nick.text);
            ly.selected = true; refresh();
        };

        // Bind
        var pBind = pal.add("panel", undefined, "Bind selected property"); pBind.alignChildren = "fill"; pBind.margins=8;
        var gb = pBind.add("group");
        gb.add("statictext", undefined, "Rack:"); var ddRack = gb.add("dropdownlist", undefined, []);
        gb.add("statictext", undefined, "Out:");  var ddCh = gb.add("dropdownlist", undefined, ["A","B","C"]); ddCh.selection=0;
        var gm = pBind.add("group");
        var rbOut = gm.add("radiobutton", undefined, "Output-side"); rbOut.value=true;
        var rbTgt = gm.add("radiobutton", undefined, "Target-side remap");
        var gr = pBind.add("group");
        gr.add("statictext", undefined, "Range:"); var tMin = gr.add("edittext", undefined, "0"); tMin.characters=5;
        gr.add("statictext", undefined, "to"); var tMax = gr.add("edittext", undefined, "1"); tMax.characters=5;
        pBind.add("button", undefined, "Bind").onClick = function(){
            var prop = selectedProp(); if (!prop) return;
            if (!ddRack.selection){ alert("Pick a rack."); return; }
            var rack = ddRack.selection.rackLayer;
            bindTarget(prop, rack, ddCh.selection.text,
                       rbTgt.value ? "target" : "output",
                       parseFloat(tMin.text), parseFloat(tMax.text));
        };

        // Chain
        var pChain = pal.add("panel", undefined, "Chain racks (sidechain)"); pChain.alignChildren="fill"; pChain.margins=8;
        var gc = pChain.add("group");
        gc.add("statictext", undefined, "From"); var ddA = gc.add("dropdownlist", undefined, []);
        gc.add("statictext", undefined, "Out"); var ddAch = gc.add("dropdownlist", undefined, ["A","B","C"]); ddAch.selection=0;
        var gc2 = pChain.add("group");
        gc2.add("statictext", undefined, "Into"); var ddB = gc2.add("dropdownlist", undefined, []);
        gc2.add("statictext", undefined, "Input"); var ddBin = gc2.add("dropdownlist", undefined, ["A","B","C"]); ddBin.selection=0;
        pChain.add("button", undefined, "Chain").onClick = function(){
            if (!ddA.selection || !ddB.selection){ alert("Pick both racks."); return; }
            chainRacks(ddA.selection.rackLayer, ddB.selection.rackLayer,
                       ddAch.selection.text, ddBin.selection.text);
        };

        // Scope + Bake
        var gz = pal.add("group");
        gz.add("button", undefined, "Add Scope").onClick = function(){
            var c = activeComp(); if (!c) return;
            if (!ddRack.selection){ alert("Pick a rack in Bind."); return; }
            addScope(c, ddRack.selection.rackLayer);
        };
        var gk = pal.add("group");
        gk.add("button", undefined, "Bake (keep expr)").onClick = function(){ var p=selectedProp(); if(p) bakeProperty(p,false); };
        gk.add("button", undefined, "Bake + Detach").onClick = function(){ var p=selectedProp(); if(p) bakeProperty(p,true); };

        pal.add("button", undefined, "Refresh rack list").onClick = function(){ refresh(); };

        function refresh(){
            var c = app.project.activeItem;
            var racks = (c && c instanceof CompItem) ? findRacks(c) : [];
            [ddRack, ddA, ddB].forEach ? null : 0; // ExtendScript has no forEach on arrays reliably
            var dds = [ddRack, ddA, ddB];
            for (var d = 0; d < dds.length; d++){
                var dd = dds[d]; dd.removeAll();
                for (var i = 0; i < racks.length; i++){
                    var it = dd.add("item", racks[i].name);
                    it.rackLayer = racks[i];
                }
                if (racks.length) dd.selection = 0;
            }
        }
        refresh();

        if (pal instanceof Window){ pal.center(); pal.show(); }
        else { pal.layout.layout(true); }
        return pal;
    }

    buildUI(thisObj);

})(this);
