const WebviewTooltip = imports.app.reader.webviewTooltip;
const CssClassMatcher = imports.tests.CssClassMatcher;
const StyleClasses = imports.app.styleClasses;

describe('Webview tooltip', function () {
    let tooltip;

    beforeEach(function () {
        jasmine.addMatchers(CssClassMatcher.customMatchers);
        tooltip = new WebviewTooltip.WebviewTooltip();
    });

    it('constructs', function () {});

    it('has the correct CSS class', function () {
        expect(tooltip).toHaveCssClass(StyleClasses.READER_WEBVIEW_TOOLTIP);
    });
});
