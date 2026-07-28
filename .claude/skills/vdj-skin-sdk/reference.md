---
name: vdj-skin-sdk
description: VirtualDJ Skin SDK reference — XML schema, elements, attributes, sysicon catalog, color table, and VDJ Script patterns for building skin renderers and editors
metadata:
  type: reference
  source: https://virtualdj.com/wiki/Skin%20SDK.html
  fetched: 2026-07-28
---

# VirtualDJ Skin SDK Reference

## Overview
A VDJ skin is a .zip containing `.xml` definition, `.png` graphics sprite, and optional preview image.

## Root `<skin>` Element
```xml
<skin name="" version="8" width="1920" height="1080" nbdecks="4"
      comment="" image="gfx.png" author="" preview="preview.png"
      breakline="" breakline2="">
```

## Positioning & Size
- **Absolute**: `x="100" y="200"`
- **Relative** (adds to parent container offset): `x="+100" y="+30"`
- **Math**: left-to-right eval, e.g. `x="100-10+5"` = 95, `x="100/2+10"` = 60
- **3 equivalent forms**: `<pos>` child, `<pos>` with width/height, or direct attributes on element

## Color System
- **AARRGGBB hex**: `#FF0000FF` (alpha+RGB), `#0000FF` (6-char = fully opaque)
- **RGB decimal**: `"255,0,0"` for red
- **Named colors**: 24 built-in (red, green, blue, white, black, yellow, cyan, magenta, gray, orange, darkred, darkgreen, darkblue, darkyellow, darkcyan, darkmagenta, darkorange, darkgray, lightgray, pink, beige, marine, violet, transparent/none/reset)
- **Custom defines**: `<define color="name" value="#hex" deck="1"/>`
- **VDJ Script**: backtick-delimited actions like `` color="`get_key_color`" ``

## Elements

### Containers
| Element | Key Attributes |
|---------|---------------|
| `<group name="" x="" y="" visibility="">` | Position offset, visibility condition |
| `<panel visible="yes|no" name="" group="">` | Toggle-able group, shared `group` = radio behavior |
| `<deck deck="1|2|3|4|left|right|master">` | Deck context for children |
| `<window name="" width="" height="" posx="" posy="" image="" shown="" resize="">` | Floating window |
| `<stack>` / `<splitpanel>` | Tabbed / split layouts |

### Display Elements

**`<button>`** — Clickable button with graphic states
- States: `<up>`/`<off>`, `<down>`/`<on>`, `<over>`, `<selected>`, `<overselected>`, `<downselected>`
- Image mode: `<off x="120" y="1890"/>` (coordinates in skin PNG)
- Vector mode: `<off shape="square|circle" color="" border="" border_size="" radius="" gradient="horizontal|vertical|circular" color2=""/>`
- Mouse masks: `<mouserect x="" y="" width="" height="">`, `<mousecircle x="" y="" r="">`
- Text: `<text fontsize="" color="" colorover="" colordown="" colorselected="" align="" format="" text="" action=""/>`
- Icon: `<icon sysicon="" width="" height="" dx="" dy="" coloroff="" colorover=""/>`
- Actions: `action`, `leftclick`, `middleclick`, `rightclick`, `dblclick`, `query`

**`<slider>`** — Fader/knob
- `orientation="horizontal|vertical|circle|round|2d"`, `direction="up|down|left|right"`
- `relative="yes|no"`, `frommiddle="true|false"`
- Children: `<fader>` (with `<pos>`, `<over>`), `<fill>` (ring with `<on>`/`<off>`), `<circle>` (with anglemin/anglemax/sectsize/direction)

**`<textzone>`** — Text display
- Multiple `<text>` children (cycled on click, or grouped horizontally with `group="horizontal"`)
- `<text>`: `font`, `fontsize`, `color`, `align`, `valign`, `dx`, `dy`, `width`, `scroll="yes|no"`, `multiline="yes|no"`
- Content: `text=""` (static), `format=""` (dynamic with %shortcuts), `action=""` (VDJ Script)
- %shortcuts: `%title`, `%author`, `%time`, `%spent`, `%left`, `%bpm`, `%key`, `%loop`, `%pitch`, `%level`, `%cpu`, `%status`, `%counter`, etc.
- Modifiers: `%P` (pitch-adjusted), `%L` (local), `%B` (beats)

**`<visual>`** — Dynamic graphics
- `source=""` (beat/rotation/arm/volume/position/get_* numeric action)
- `type="onoff|transparent|linear|custom|color|vumeter"`
- `<off>`/`<on>` graphics, `<up>` for custom type, `<led>` for VU-meter

**`<songpos>`** — Waveform/song position with `<cues>`, `<loops>`, `<wave>` children

**`<square>`/`<circle>`/`<line>`** — Vector shapes
- `color`, `radius` (square), `border`, `border_color`, `highlight` (line), `shadow` (line)
- Optional `<gradient type="horizontal|vertical|circular" color1="" color2="">` child

**Other**: `<video>`, `<scratch>`, `<browser>` (with `<colors>` sub-tree), `<cover>`, `<logo>`, `<grabzone>`, `<resizezone>`

## Define System
```xml
<define class="button_main" placeholders="width=62,height=30,textaction,sysicon,icsize,tsize=11,tcolor=textoff">
  <size width="[WIDTH]" height="[HEIGHT]"/>
  <off color="buttonoff" border="bordercolor" border_size="1" radius="2"/>
  <text fontsize="[TSIZE]" color="[TCOLOR]" action="[TEXTACTION]"/>
  <icon sysicon="[SYSICON]" width="[ICSIZE]" height="[ICSIZE]"/>
</define>
<!-- Usage: element children override define children -->
<button class="button_main" x="+0" y="+0" width="64" height="35" taction="cue_button"/>
```
Color defines: `<define color="name" value="#hex" deck="1"/>`

## Common Attributes
- `deck="1|2|3|4|left|right|master|default"` — deck association
- `visibility=""` — VDJ Script returning true/false
- `os="mac|pc"` — OS filter
- `panel=""` — panel membership (deprecated for nesting)

## VDJ Script
- Chaining: `action1 & action2`
- Variables: `@$variablename`
- Conditions: `var_equal '@$var' value`
- Logic: `&&` (AND)
- Inline color: `constant '#FF0000'`

## Sysicon Quick Reference
play, play_pause, stop, pause, search, headphones, settings, minimize, maximize, close,
arrowleft, arrowright, arrowup, arrowdown, chevronup, chevrondown, chevronleft, chevronright,
automix, karaoke, quick_filter, browser_zoom, grid_view, goto_last_folder,
add_favoritefolder, add_virtualfolder, add_filterfolder, sampler_bank, sampler_mode,
sideview_triggerpad, effect_dock_gui, effect_show_gui, view_options, show_splitpanel,
sideview, font_size, sampler_drop, sampler_loop, sampler_mic, browser_options
