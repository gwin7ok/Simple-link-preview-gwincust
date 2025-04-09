﻿// 初期値を一元管理
const DEFAULT_SETTINGS = {
    iconDisplayDelay: 500,
    iconDisplayTime: 2500,
    offsetX: -20,
    offsetY: -10,
    frameDisplayDelay: 500,
    frameDisplayTime: 2000,
    frameUpdateTime: 500
};

// 初期値の直接定義を削除
let ICON_DISPLAY_DELAY;
let ICON_DISPLAY_TIME;
let OFFSET_X;
let OFFSET_Y;
let FRAME_DISPLAY_DELAY;
let FRAME_DISPLAY_TIME;
let FRAME_UPDATE_TIME;

// 設定を動的に更新する関数
function updateSettings() {
    browser.storage.local.get(DEFAULT_SETTINGS).then((settings) => {
        ICON_DISPLAY_DELAY = settings.iconDisplayDelay;
        ICON_DISPLAY_TIME = settings.iconDisplayTime;
        OFFSET_X = settings.offsetX;
        OFFSET_Y = settings.offsetY;
        FRAME_DISPLAY_DELAY = settings.frameDisplayDelay;
        FRAME_DISPLAY_TIME = settings.frameDisplayTime;
        FRAME_UPDATE_TIME = settings.frameUpdateTime;

        // タイマーのタイムアウト値を更新
        preview_icon.show_timer.updateTimeout(ICON_DISPLAY_DELAY);
        preview_icon.hide_timer.updateTimeout(ICON_DISPLAY_TIME);
        preview_frame.show_timer.updateTimeout(FRAME_DISPLAY_DELAY);
        preview_frame.hide_timer.updateTimeout(FRAME_DISPLAY_TIME);
        preview_frame.update_timer.updateTimeout(FRAME_UPDATE_TIME);

        // デバッグ用ログ
        console.log("設定が更新されました:", {
            ICON_DISPLAY_DELAY,
            ICON_DISPLAY_TIME,
            OFFSET_X,
            OFFSET_Y,
            FRAME_DISPLAY_DELAY,
            FRAME_DISPLAY_TIME,
            FRAME_UPDATE_TIME
        });
    });
}

// 初期設定を読み込む
updateSettings();

// 設定が変更されたときに再読み込み
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        updateSettings();
    }
});

class Timer {
    constructor(func, timeout) {
        this.func = func;
        this.timeout = timeout;
        this.running = false;
    }
    start() {
        if (!this.running) {
            this.timer = setTimeout(this._exec.bind(this), this.timeout);
            this.running = true;
        }
    }
    _exec() {
        this.func();
        this.running = false;
    }
    stop() {
        if (this.running) {
            clearTimeout(this.timer);
            this.running = false;
        }
    }
    updateTimeout(newTimeout) {
        this.timeout = newTimeout; // タイムアウト値を更新
    }
}

class PreviewIcon {
    constructor() {
        this.show_timer = new Timer(this._show.bind(this), ICON_DISPLAY_DELAY);
        this.hide_timer = new Timer(this._hide.bind(this), ICON_DISPLAY_TIME);
        this.icon = this.build_icon();
    }
    show(url, posX, posY) {
        if (this.icon.style.visibility == 'hidden'){
            this.url = url
            this.pos = this._getIconPosition(posX, posY)
            this.show_timer.stop()
            this.show_timer.start()
//            this.hide_timer.stop()
        }
    }
    _show() {
        this.icon.style.left = this.pos.x + "px";
        this.icon.style.top  = this.pos.y + "px";
        this.icon.style.visibility = 'visible';
        this.hide_timer.start()
    }
    _hide() {
        this.icon.style.visibility = 'hidden';
    }

    build_icon() {
        let icon = document.createElement("img");
        icon.setAttribute("src", browser.extension.getURL("images/mouseover.png"));
        icon.setAttribute("id", "link_preview_icon");
        icon.style.visibility = 'hidden';
        document.body.appendChild(icon);
        icon.addEventListener("mouseover", this._on_mouseover.bind(this))
        icon.addEventListener("mouseout", this._on_mouseout.bind(this))
        return icon
    }
    _getIconPosition(cursorX, cursorY) {
        const posX = cursorX + OFFSET_X;
        const posY = cursorY + OFFSET_Y;
        return { x: posX, y: posY };
    }
    _on_mouseover(e){
        this.hide_timer.stop()
        preview_frame.show(this.url)
    }
    _on_mouseout(e){
        this.hide_timer.start()
        preview_frame.hide()
    }
}

class PreviewFrame {
    constructor() {
        this._display = false;
        this.show_timer = new Timer(this._show.bind(this), FRAME_DISPLAY_DELAY);
        this.hide_timer = new Timer(this._hide.bind(this), FRAME_DISPLAY_TIME);
        this.update_timer = new Timer(this._update.bind(this), FRAME_UPDATE_TIME);
        this.locked = false;
        this.frame = this.build_frame();
        this.iframe = this.frame.querySelector('#lprv_content');
    }
    get display() {
        return this._display
    }

    show(url) {
        this.url = url;
        this.show_timer.start();
        this.hide_timer.stop();

        // body要素の右マージンを設定
        document.body.style.marginRight = '800px'; // プレビューウィンドウの幅に合わせて調整
    }
    _show() {
        this._display = true;
//console.log(this.url)
        this.iframe.src = this.url
        this.frame.style.visibility = 'visible';
    }
    hide() {
        if (!this.locked) {
            this.hide_timer.start()
        }
        this.show_timer.stop()
        this.update_timer.stop()
    }
    _hide() {
        this._display = false;
        this.iframe.src = "about:blank";
        this.frame.style.visibility = 'hidden';

        // body要素の右マージンをリセット
        document.body.style.marginRight = '0';
    }
    update(url) {
        this.url = url
        this.hide_timer.stop()
        this.update_timer.start()
    }
    _update() {
        if (this.iframe.src != this.url){
//console.log(this.url)
            this.iframe.src = this.url
        }
        this.hide_timer.stop()
    }
    build_frame() {
        let frame = document.createElement("div");
        frame.setAttribute("id", "lprv_frame");
        frame.style.visibility = 'hidden';
        frame.innerHTML = `
          <div class="lprv_toolbar">
            <div id="logo"></div>
            <div class="lprv_btn_group">
              <button class="lprv_btn" id="back" title="Back"></button>
              <button class="lprv_btn" id="forward" title="Forward"></button>
            </div>
            <div class="lprv_btn_group">
              <button class="lprv_btn" id="open_tab" title="Open in new tab"></button>
            </div>
            <div class="lprv_btn_group" id="pin">
              <button class="lprv_btn" id="push-pin" title="Keep preview frame open"></button>
              <button class="lprv_btn" id="hide" title="Hide preview frame"></button>
            </div>
          </div>
          <div id="lprv_vresize"></div>
          <iframe id="lprv_content"></iframe>
        `
//          <iframe id="lprv_content" style="background-color: white;"></iframe>
        browser.storage.local.get("width_percentage").then((settings) => {
            if (settings.width_percentage) {
                frame.style.width = settings.width_percentage + "%"
            }
        }) 

        frame.querySelector('#back').addEventListener("click", this._on_nav_back_click.bind(this))
        frame.querySelector('#forward').addEventListener("click", this._on_nav_forward_click.bind(this))
        frame.querySelector('#open_tab').addEventListener("click", this._on_open_tab_click.bind(this))
        frame.querySelector('#push-pin').addEventListener("click", this._on_push_pin_click.bind(this))
        frame.querySelector('#hide').addEventListener("click", this._on_hide_click.bind(this))

        frame.querySelector('#lprv_vresize').addEventListener("mousedown", this._on_vresizer_mousedown.bind(this))

        document.body.appendChild(frame);
        frame.addEventListener("mouseenter", this._on_mouseover.bind(this))
        frame.addEventListener("mouseleave", this._on_mouseout.bind(this))
        return frame
    }

    _on_nav_back_click(e) {
        window.history.back();
    }
    _on_nav_forward_click() {
        window.history.forward();
    }
    _on_open_tab_click() {
        const url = this.iframe.contentWindow.location.href 
        let win = window.open(url, '_blank');
        win.focus();
    }
    _on_push_pin_click(e) {
        let btn = e.target
        this.locked = !this.locked
        this.locked ? btn.setAttribute('locked', 'yes') : btn.removeAttribute('locked')
    }
    _on_hide_click(e) {
        this._hide()
    }
    _on_mouseover(e){
        this.hide_timer.stop()
    }
    _on_mouseout(e){
        if (!this.locked) {
            this.hide_timer.start()
        }
    }

    _on_vresizer_mousedown(e) {
        const document_width = document.body.clientWidth

        let frame = this.frame // чтобы не биндить document.onmouse...
        let resizer = frame.querySelector('#lprv_vresize')
        resizer.style.width = '100%' // иначе не отслеживает mousemove над iframe

        const old_document_onmousedown = document.onmousedown
        document.onmousedown = () => {return false} // блокирует выделение текста в основном окне

        document.onmousemove = function(e) {
            const width = document_width - e.clientX
            frame.style.width = width + 'px'
        }

        document.onmouseup = function() {
            resizer.style.width = null // возврат к прописанным в css значениям
            const width_percentage = Math.floor(100 * frame.clientWidth/document_width) // пересчитать пиксели в проценты
            frame.style.width = width_percentage + "%"
            browser.storage.local.set({
                width_percentage: width_percentage
            });
            document.onmousemove = null;
            document.onmouseup = null;
            document.onmousedown = old_document_onmousedown
        }
    }

}

let preview_icon = new PreviewIcon()
let preview_frame = new PreviewFrame()

let links = document.querySelectorAll('a')
//Array.prototype.forEach.call(links, (e) => e.addEventListener('mouseenter', on_link_mouseover))
//Array.prototype.forEach.call(links, (e) => e.addEventListener('mouseleave', on_link_mouseout))

document.addEventListener('mouseover', on_link_mouseover_doc)
document.addEventListener('mouseout', on_link_mouseout_doc)

/*
function on_link_mouseover(e) {
    let url = e.target.href
//console.log(url)
// TODO: возможно надо поудалять javascript, mailto, ftp, #
    if (preview_frame.display) {
        preview_frame.update(url)
    } else {
        preview_icon.show(url, e.clientX, e.clientY)
    }
}

function on_link_mouseout(e) {
    if (preview_frame.display) {
        preview_frame.hide()
    }
}
*/
function on_link_mouseover_doc(e) {
    console.log("マウスオーバーイベントが発生しました"); // デバッグ用ログ

    browser.storage.local.get("previewEnabled").then((data) => {
        console.log(`プレビュー機能の状態: ${data.previewEnabled}`); // デバッグ用ログ
        if (!data.previewEnabled) return;

        if (e.target.nodeName == 'A') {
            console.log(`リンク先の URL: ${e.target.href}`); // デバッグ用ログ
            let url = e.target.href;
            if (preview_frame.display) {
                preview_frame.update(url);
            } else {
                preview_icon.show(url, e.clientX, e.clientY);
            }
        } else if (e.type == "mouseover") {
            let parent = { target: e.target.parentNode, clientX: e.clientX, clientY: e.clientY };
            on_link_mouseover_doc(parent);
        }
    });
}

function on_link_mouseout_doc(e) {
    if (e.target.nodeName == 'A'){
        if (preview_frame.display) {
            preview_frame.hide()
        }
    }
}

// link_preview.js
function on_link_mouseover_doc(e) {
    console.log("マウスオーバーイベントが発生しました"); // デバッグ用ログ

    browser.storage.local.get("previewEnabled").then((data) => {
        console.log(`プレビュー機能の状態: ${data.previewEnabled}`); // デバッグ用ログ
        if (!data.previewEnabled) return;

        if (e.target.nodeName == 'A') {
            console.log(`リンク先の URL: ${e.target.href}`); // デバッグ用ログ
            let url = e.target.href;
            if (preview_frame.display) {
                preview_frame.update(url);
            } else {
                preview_icon.show(url, e.clientX, e.clientY);
            }
        }
    });
}
