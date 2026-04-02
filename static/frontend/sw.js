/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-0d7dea0d'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "whiteGoogleLogo.png",
    "revision": null
  }, {
    "url": "vite.svg",
    "revision": null
  }, {
    "url": "settings (1).png",
    "revision": null
  }, {
    "url": "registerSW.js",
    "revision": null
  }, {
    "url": "notifications.png",
    "revision": null
  }, {
    "url": "index.html",
    "revision": null
  }, {
    "url": "index-C-OqMN2m.css",
    "revision": null
  }, {
    "url": "index-BzitvNKT.js",
    "revision": null
  }, {
    "url": "_WhiteArrowIcon.png",
    "revision": null
  }, {
    "url": "WhiteShieldIcon.png",
    "revision": null
  }, {
    "url": "WhitePlusIcon.png",
    "revision": null
  }, {
    "url": "WhitePersonChecked.png",
    "revision": null
  }, {
    "url": "WhiteHandIcon.png",
    "revision": null
  }, {
    "url": "WhiteEyeIcon.png",
    "revision": null
  }, {
    "url": "WhiteDownloadIcon.png",
    "revision": null
  }, {
    "url": "WhiteDirectionIcon.png",
    "revision": null
  }, {
    "url": "WhiteChecklistIcon.png",
    "revision": null
  }, {
    "url": "WhiteArrowIcon.png",
    "revision": null
  }, {
    "url": "WhiteAnalysisIcon.png",
    "revision": null
  }, {
    "url": "WIthBG_Logomark.png",
    "revision": null
  }, {
    "url": "SettingsIcon.png",
    "revision": null
  }, {
    "url": "RemoveBG_Logomark.png",
    "revision": null
  }, {
    "url": "RedRejectedIcon.png",
    "revision": null
  }, {
    "url": "RedAlertIcon.png",
    "revision": null
  }, {
    "url": "PrimaryWaveHandIcon.png",
    "revision": null
  }, {
    "url": "PrimaryUploadIcon.png",
    "revision": null
  }, {
    "url": "PrimaryToolIcon.png",
    "revision": null
  }, {
    "url": "PrimarySliderIcon.png",
    "revision": null
  }, {
    "url": "PrimaryShieldIcon.png",
    "revision": null
  }, {
    "url": "PrimarySendIcon.png",
    "revision": null
  }, {
    "url": "PrimaryPlusIcon.png",
    "revision": null
  }, {
    "url": "PrimaryPersonIcon.png",
    "revision": null
  }, {
    "url": "PrimaryPersonChecked.png",
    "revision": null
  }, {
    "url": "PrimaryPenIcon.png",
    "revision": null
  }, {
    "url": "PrimaryPenCircleIcon.png",
    "revision": null
  }, {
    "url": "PrimaryNotificationsIcon.png",
    "revision": null
  }, {
    "url": "PrimaryMenuIcon.png",
    "revision": null
  }, {
    "url": "PrimaryLogoutIcon.png",
    "revision": null
  }, {
    "url": "PrimaryLockIcon.png",
    "revision": null
  }, {
    "url": "PrimaryHomeIcon.png",
    "revision": null
  }, {
    "url": "PrimaryHandIcon.png",
    "revision": null
  }, {
    "url": "PrimaryFolderIcon.png",
    "revision": null
  }, {
    "url": "PrimaryEyeIcon.png",
    "revision": null
  }, {
    "url": "PrimaryExportIcon.png",
    "revision": null
  }, {
    "url": "PrimaryDownloadIcon.png",
    "revision": null
  }, {
    "url": "PrimaryClockIcon.png",
    "revision": null
  }, {
    "url": "PrimaryClipboardIcon.png",
    "revision": null
  }, {
    "url": "PrimaryCirclePlusIcon.png",
    "revision": null
  }, {
    "url": "PrimaryChevronIcon.png",
    "revision": null
  }, {
    "url": "PrimaryChecklistIcon.png",
    "revision": null
  }, {
    "url": "PrimaryCalendarIcon.png",
    "revision": null
  }, {
    "url": "PrimaryBarChartIcon.png",
    "revision": null
  }, {
    "url": "PrimaryArrowIcon.png",
    "revision": null
  }, {
    "url": "PrimaryArchiveIcon.png",
    "revision": null
  }, {
    "url": "PrimaryAnalysisIcon.png",
    "revision": null
  }, {
    "url": "PrimaryAlertIcon.png",
    "revision": null
  }, {
    "url": "PrimaryAdminIcon.png",
    "revision": null
  }, {
    "url": "Pen Swish White_FacultyClearTrack.png",
    "revision": null
  }, {
    "url": "Pen Swish Dark Blue_FacultyClearTrack.png",
    "revision": null
  }, {
    "url": "Pen Swish Black_FacultyClearTrack.png",
    "revision": null
  }, {
    "url": "Pen - Blue_FacultyClearTrack.png",
    "revision": null
  }, {
    "url": "Icon (2).png",
    "revision": null
  }, {
    "url": "Home.png",
    "revision": null
  }, {
    "url": "GreySettingsIcon.png",
    "revision": null
  }, {
    "url": "GreyNotificationsIcon.png",
    "revision": null
  }, {
    "url": "GreyLogoutIcon.png",
    "revision": null
  }, {
    "url": "GreyHomeIcon.png",
    "revision": null
  }, {
    "url": "GreyAddIcon.png",
    "revision": null
  }, {
    "url": "GreenApprovedIcon.png",
    "revision": null
  }, {
    "url": "GrayPenIcon.png",
    "revision": null
  }, {
    "url": "GrayClockIcon.png",
    "revision": null
  }, {
    "url": "GrayCalendarIcon.png",
    "revision": null
  }, {
    "url": "GrayArrowIcon.png",
    "revision": null
  }, {
    "url": "GoogleIcon.png",
    "revision": null
  }, {
    "url": "BlackXIcon.png",
    "revision": null
  }, {
    "url": "BlackUnderlineIcon.png",
    "revision": null
  }, {
    "url": "BlackNumberingIcon.png",
    "revision": null
  }, {
    "url": "BlackLogoutIcon.png",
    "revision": null
  }, {
    "url": "BlackItalicIcon.png",
    "revision": null
  }, {
    "url": "BlackHyperlinkIcon.png",
    "revision": null
  }, {
    "url": "BlackHomeIcon.png",
    "revision": null
  }, {
    "url": "BlackGroupIcon.png",
    "revision": null
  }, {
    "url": "BlackGoogleLogo.png",
    "revision": null
  }, {
    "url": "BlackFileIcon.png",
    "revision": null
  }, {
    "url": "BlackChevronIcon.png",
    "revision": null
  }, {
    "url": "BlackCheckIcon.png",
    "revision": null
  }, {
    "url": "BlackBulletinIcon.png",
    "revision": null
  }, {
    "url": "BlackBookmarkIcon.png",
    "revision": null
  }, {
    "url": "BlackBoldIcon.png",
    "revision": null
  }, {
    "url": "BlackArrowIcon.png",
    "revision": null
  }, {
    "url": "Pen Swish White_FacultyClearTrack.png",
    "revision": "d1135a78cc01dbdbdb7e3afa426a67e7"
  }, {
    "url": "RemoveBG_Logomark.png",
    "revision": "389d6fd98b5131dbbed4c457f0b7daef"
  }, {
    "url": "manifest.webmanifest",
    "revision": "fef6386467a6fc5e25194edf3ad0c102"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    })]
  }), 'GET');
  workbox.registerRoute(/\.(?:png|jpg|jpeg|svg|gif|webp)$/, new workbox.CacheFirst({
    "cacheName": "images-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 2592000
    })]
  }), 'GET');
  workbox.registerRoute(/\.(?:js|css)$/, new workbox.StaleWhileRevalidate({
    "cacheName": "static-resources-cache",
    plugins: []
  }), 'GET');

}));
