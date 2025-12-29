/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/remote-content";
exports.ids = ["vendor-chunks/remote-content"];
exports.modules = {

/***/ "(rsc)/./node_modules/remote-content/index.js":
/*!**********************************************!*\
  !*** ./node_modules/remote-content/index.js ***!
  \**********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const axios = __webpack_require__(/*! axios */ \"(rsc)/./node_modules/axios/dist/node/axios.cjs\");\nconst getProxyForUrl = (__webpack_require__(/*! proxy-from-env */ \"(rsc)/./node_modules/proxy-from-env/index.js\").getProxyForUrl);\n\nmodule.exports = (remoteUrl, callback) => {\n    const axiosConfig = {};\n    const proxyUrl = getProxyForUrl(remoteUrl);\n\n    if (proxyUrl) {\n        const proxyUrlData = new URL(proxyUrl);\n\n        axiosConfig.proxy = {\n            protocol: proxyUrlData.protocol.replace(':', ''),\n            host: proxyUrlData.hostname,\n            port: proxyUrlData.port,\n        };\n    }\n\n    axios.get(remoteUrl, axiosConfig).then(response => {\n        if (response.statusText === 'OK') {\n            return callback(null, response.data);\n        }\n\n        return callback(new Error(`GET ${remoteUrl} ${response.status}`));\n    }).catch(error => {\n        callback(error);\n    });\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvcmVtb3RlLWNvbnRlbnQvaW5kZXguanMiLCJtYXBwaW5ncyI6IkFBQUEsY0FBYyxtQkFBTyxDQUFDLDZEQUFPO0FBQzdCLHVCQUF1QiwwR0FBd0M7O0FBRS9EO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSx5Q0FBeUMsV0FBVyxFQUFFLGdCQUFnQjtBQUN0RSxLQUFLO0FBQ0w7QUFDQSxLQUFLO0FBQ0wiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9jdXJhY2VsLXBlb3BsZS8uL25vZGVfbW9kdWxlcy9yZW1vdGUtY29udGVudC9pbmRleC5qcz9hM2U3Il0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGF4aW9zID0gcmVxdWlyZSgnYXhpb3MnKTtcbmNvbnN0IGdldFByb3h5Rm9yVXJsID0gcmVxdWlyZSgncHJveHktZnJvbS1lbnYnKS5nZXRQcm94eUZvclVybDtcblxubW9kdWxlLmV4cG9ydHMgPSAocmVtb3RlVXJsLCBjYWxsYmFjaykgPT4ge1xuICAgIGNvbnN0IGF4aW9zQ29uZmlnID0ge307XG4gICAgY29uc3QgcHJveHlVcmwgPSBnZXRQcm94eUZvclVybChyZW1vdGVVcmwpO1xuXG4gICAgaWYgKHByb3h5VXJsKSB7XG4gICAgICAgIGNvbnN0IHByb3h5VXJsRGF0YSA9IG5ldyBVUkwocHJveHlVcmwpO1xuXG4gICAgICAgIGF4aW9zQ29uZmlnLnByb3h5ID0ge1xuICAgICAgICAgICAgcHJvdG9jb2w6IHByb3h5VXJsRGF0YS5wcm90b2NvbC5yZXBsYWNlKCc6JywgJycpLFxuICAgICAgICAgICAgaG9zdDogcHJveHlVcmxEYXRhLmhvc3RuYW1lLFxuICAgICAgICAgICAgcG9ydDogcHJveHlVcmxEYXRhLnBvcnQsXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgYXhpb3MuZ2V0KHJlbW90ZVVybCwgYXhpb3NDb25maWcpLnRoZW4ocmVzcG9uc2UgPT4ge1xuICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzVGV4dCA9PT0gJ09LJykge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcihgR0VUICR7cmVtb3RlVXJsfSAke3Jlc3BvbnNlLnN0YXR1c31gKSk7XG4gICAgfSkuY2F0Y2goZXJyb3IgPT4ge1xuICAgICAgICBjYWxsYmFjayhlcnJvcik7XG4gICAgfSk7XG59O1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/remote-content/index.js\n");

/***/ })

};
;