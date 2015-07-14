const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const Utils = imports.tests.utils;
Utils.register_gresource();

const MinimalCard = imports.tests.minimalCard;
const MockEngine = imports.tests.mockEngine;
const MockFactory = imports.tests.mockFactory;
const MockWidgets = imports.tests.mockWidgets;
const Presenter = imports.app.presenter;

Gtk.init(null);

const TEST_CONTENT_DIR = Utils.get_test_content_srcdir();

const MockHomePage = new Lang.Class({
    Name: 'MockHomePage',
    Extends: GObject.Object,
    Signals: {
        'search-entered': {
            param_types: [GObject.TYPE_STRING],
        },
    },

    _init: function () {
        this.parent();
        this.search_box = {};
        this.app_banner = {};
    },

    connect: function (signal, handler) {
        // Silently ignore signals that we aren't mocking
        if (GObject.signal_lookup(signal, MockHomePage.$gtype) === 0)
            return;
        this.parent(signal, handler);
    },
});

const MockView = new Lang.Class({
    Name: 'MockView',
    Extends: GObject.Object,
    Signals: {
        'search-entered': {
            param_types: [GObject.TYPE_STRING],
        },
    },

    _init: function () {
        this.parent();
        let connectable_object = {
            connect: function () {},
        };
        this.section_page = connectable_object;
        this.home_page = new MockHomePage();
        this.home_page.tab_button = {};
        this.categories_page = connectable_object;
        this.categories_page.tab_button = {};
        this.article_page = connectable_object;
        this.lightbox = new GObject.Object();
        this.search_box = {};
        this.no_search_results_page = {};
        this.history_buttons = new MockWidgets.MockHistoryButtons();
    },

    connect: function (signal, handler) {
        // Silently ignore signals that we aren't mocking
        if (GObject.signal_lookup(signal, MockView.$gtype) === 0)
            return;
        this.parent(signal, handler);
    },

    show_no_search_results_page: function () {},
    lock_ui: function () {},
    unlock_ui: function () {},
    present_with_time: function () {},
});

const MockArticlePresenter = new Lang.Class({
    Name: 'MockArticlePresenter',
    Extends: GObject.Object,

    _init: function () {
        this.parent();
    },

    connect: function () {},
});

describe('Presenter', () => {
    let presenter;
    let data;
    let view;
    let engine;
    let article_presenter;
    let factory;
    let test_app_filename = TEST_CONTENT_DIR + 'app.json';

    beforeEach(() => {
        factory = new MockFactory.MockFactory();
        factory.add_named_mock('home-card', MinimalCard.MinimalCard);
        factory.add_named_mock('results-card', MinimalCard.MinimalCard);
        factory.add_named_mock('pdf-card', MinimalCard.MinimalCard);

        data = Utils.parse_object_from_path(test_app_filename);
        data['styles'] = {};
        view = new MockView();
        engine = new MockEngine.MockEngine();
        article_presenter = new MockArticlePresenter();
        let application = new GObject.Object();
        application.application_id = 'foobar';
        presenter = new Presenter.Presenter(data, {
            application: application,
            factory: factory,
            article_presenter: article_presenter,
            engine: engine,
            view: view,
        });
        spyOn(presenter, 'record_search_metric');
    });

    it('can be constructed', () => {});

    it('can set cards on view from json', () => {
        expect(data['sections'].map((section) => {
            return section['title'];
        })).toEqual(presenter.view.home_page.cards.map((card) => {
            return card.model.title;
        }));

        expect(data['sections'].map((section) => {
            return section['thumbnailURI'];
        })).toEqual(presenter.view.home_page.cards.map((card) => {
            return card.model.thumbnail_uri;
        }));

        expect(data['sections'].map((section) => {
            return !!section['featured'];
        })).toEqual(presenter.view.home_page.cards.map((card) => {
            return card.model.featured;
        }));
    });

    describe('searching from search box', function () {
        beforeEach(function () {
            spyOn(view, 'show_no_search_results_page');
            engine.get_objects_by_query_finish.and.returnValue([[], null]);
        });

        it('works from the title bar', function (done) {
            view.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(engine.get_objects_by_query)
                    .toHaveBeenCalledWith(jasmine.objectContaining({
                        query: 'query not found',
                    }),
                    jasmine.any(Object),
                    jasmine.any(Function));
                expect(view.show_no_search_results_page).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });

        it('works from the home page', function (done) {
            view.home_page.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(engine.get_objects_by_query)
                    .toHaveBeenCalledWith(jasmine.objectContaining({
                        query: 'query not found',
                    }),
                    jasmine.any(Object),
                    jasmine.any(Function));
                expect(view.show_no_search_results_page).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });

        it('records a metric when you search from the title bar', function (done) {
            view.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(presenter.record_search_metric).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });

        it('records a metric when you search from the home page', function (done) {
            view.home_page.emit('search-entered', 'query not found');
            Mainloop.idle_add(function () {
                expect(presenter.record_search_metric).toHaveBeenCalled();
                done();
                return GLib.SOURCE_REMOVE;
            });
        });
    });
});
