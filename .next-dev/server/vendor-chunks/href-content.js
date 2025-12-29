/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/href-content";
exports.ids = ["vendor-chunks/href-content"];
exports.modules = {

/***/ "(rsc)/./node_modules/href-content/index.js":
/*!********************************************!*\
  !*** ./node_modules/href-content/index.js ***!
  \********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const url = __webpack_require__(/*! url */ \"url\");\nconst fs = __webpack_require__(/*! fs */ \"fs\");\nconst getRemoteContent = __webpack_require__(/*! remote-content */ \"(rsc)/./node_modules/remote-content/index.js\");\n\nmodule.exports = (destHref, sourceHref, callback) => {\n    let resolvedUrl;\n    let parsedUrl;\n    let toUrl = destHref;\n\n    if (url.parse(sourceHref).protocol === 'file:' && destHref[0] === '/') {\n        toUrl = destHref.slice(1);\n    }\n    resolvedUrl = url.resolve(sourceHref, toUrl);\n    parsedUrl = url.parse(resolvedUrl);\n    if (parsedUrl.protocol === 'file:') {\n        fs.readFile(decodeURIComponent(parsedUrl.pathname), 'utf8', callback);\n    } else {\n        getRemoteContent(resolvedUrl, callback);\n    }\n};\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvaHJlZi1jb250ZW50L2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFBLFlBQVksbUJBQU8sQ0FBQyxnQkFBSztBQUN6QixXQUFXLG1CQUFPLENBQUMsY0FBSTtBQUN2Qix5QkFBeUIsbUJBQU8sQ0FBQyxvRUFBZ0I7O0FBRWpEO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsid2VicGFjazovL2N1cmFjZWwtcGVvcGxlLy4vbm9kZV9tb2R1bGVzL2hyZWYtY29udGVudC9pbmRleC5qcz84NmExIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IHVybCA9IHJlcXVpcmUoJ3VybCcpO1xuY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xuY29uc3QgZ2V0UmVtb3RlQ29udGVudCA9IHJlcXVpcmUoJ3JlbW90ZS1jb250ZW50Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKGRlc3RIcmVmLCBzb3VyY2VIcmVmLCBjYWxsYmFjaykgPT4ge1xuICAgIGxldCByZXNvbHZlZFVybDtcbiAgICBsZXQgcGFyc2VkVXJsO1xuICAgIGxldCB0b1VybCA9IGRlc3RIcmVmO1xuXG4gICAgaWYgKHVybC5wYXJzZShzb3VyY2VIcmVmKS5wcm90b2NvbCA9PT0gJ2ZpbGU6JyAmJiBkZXN0SHJlZlswXSA9PT0gJy8nKSB7XG4gICAgICAgIHRvVXJsID0gZGVzdEhyZWYuc2xpY2UoMSk7XG4gICAgfVxuICAgIHJlc29sdmVkVXJsID0gdXJsLnJlc29sdmUoc291cmNlSHJlZiwgdG9VcmwpO1xuICAgIHBhcnNlZFVybCA9IHVybC5wYXJzZShyZXNvbHZlZFVybCk7XG4gICAgaWYgKHBhcnNlZFVybC5wcm90b2NvbCA9PT0gJ2ZpbGU6Jykge1xuICAgICAgICBmcy5yZWFkRmlsZShkZWNvZGVVUklDb21wb25lbnQocGFyc2VkVXJsLnBhdGhuYW1lKSwgJ3V0ZjgnLCBjYWxsYmFjayk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZ2V0UmVtb3RlQ29udGVudChyZXNvbHZlZFVybCwgY2FsbGJhY2spO1xuICAgIH1cbn07XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/href-content/index.js\n");

/***/ })

};
;