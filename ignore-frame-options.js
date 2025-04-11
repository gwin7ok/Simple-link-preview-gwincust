﻿/*
This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

Original work: Simple Link Preview by Lecron (https://addons.mozilla.org/ja/firefox/addon/simple-link-preview/)
Copyright (c) 2024 Lecron

Modifications by gwin7ok
Copyright (c) 2025 gwin7ok
*/

// https://addons.mozilla.org/ru/firefox/addon/ignore-x-frame-options/reviews/
// https://gist.github.com/dergachev/e216b25d9a144914eae2
// https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onHeadersReceived

function debugLog(message, data = null) {
    browser.storage.local.get("SLPGC_debugMode").then((settings) => {
        if (settings.SLPGC_debugMode) {
            console.log(message, data);
        }
    });
}

debugLog("ignore-frame-options.js is loaded");

let xFrameOptionsListener = null;
let contentSecurityPolicyListener = null;

// リスナーを登録する関数
function enableListeners() {
    browser.storage.local.get(["SLPGC_ignoreXFrameOptions", "SLPGC_ignoreContentSecurityPolicy"]).then((settings) => {
        if (settings.SLPGC_ignoreXFrameOptions && !xFrameOptionsListener) {
            debugLog("Enabling X-Frame-Options listener");
            xFrameOptionsListener = (details) => {
                debugLog("Intercepted headers (X-Frame-Options):", details.responseHeaders);
                const headers = details.responseHeaders.filter(
                    (header) => header.name.toLowerCase() !== "x-frame-options"
                );
                debugLog("Modified headers (X-Frame-Options):", headers);
                return { responseHeaders: headers };
            };
            browser.webRequest.onHeadersReceived.addListener(
                xFrameOptionsListener,
                { urls: ["<all_urls>"] },
                ["blocking", "responseHeaders"]
            );
        }

        if (settings.SLPGC_ignoreContentSecurityPolicy && !contentSecurityPolicyListener) {
            debugLog("Enabling Content-Security-Policy listener");
            contentSecurityPolicyListener = (details) => {
                debugLog("Intercepted headers (CSP):", details.responseHeaders);
                const headers = details.responseHeaders.filter(
                    (header) => header.name.toLowerCase() !== "content-security-policy"
                );
                debugLog("Modified headers (CSP):", headers);
                return { responseHeaders: headers };
            };
            browser.webRequest.onHeadersReceived.addListener(
                contentSecurityPolicyListener,
                { urls: ["<all_urls>"] },
                ["blocking", "responseHeaders"]
            );
        }
    });
}

// リスナーを解除する関数
function disableListeners() {
    if (xFrameOptionsListener) {
        debugLog("Disabling X-Frame-Options listener");
        browser.webRequest.onHeadersReceived.removeListener(xFrameOptionsListener);
        xFrameOptionsListener = null;
    }

    if (contentSecurityPolicyListener) {
        debugLog("Disabling Content-Security-Policy listener");
        browser.webRequest.onHeadersReceived.removeListener(contentSecurityPolicyListener);
        contentSecurityPolicyListener = null;
    }
}

// プレビュー機能の状態を監視
function updateListenersBasedOnSettings() {
    browser.storage.local.get(["SLPGC_ignoreXFrameOptions", "SLPGC_ignoreContentSecurityPolicy"]).then((settings) => {
        if (settings.SLPGC_ignoreXFrameOptions || settings.SLPGC_ignoreContentSecurityPolicy) {
            enableListeners();
        } else {
            disableListeners();
        }
    });
}

// 初期化時にリスナーを設定
updateListenersBasedOnSettings();

// 設定が変更されたときにリスナーを更新
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.SLPGC_ignoreXFrameOptions || changes.SLPGC_ignoreContentSecurityPolicy)) {
        updateListenersBasedOnSettings();
    }
});

