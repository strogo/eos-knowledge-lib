// Copyright 2015 Endless Mobile, Inc.

const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;

const ContentObjectModel = imports.search.contentObjectModel;
const Module = imports.app.interfaces.module;
const StyleClasses = imports.app.styleClasses;
const Utils = imports.app.utils;

/**
 * Interface: Card
 * Interface for card modules
 *
 * Requires:
 *   Gtk.Widget
 */
const Card = new Lang.Interface({
    Name: 'Card',
    GTypeName: 'EknCard',
    Requires: [ Gtk.Widget, Module.Module ],

    Properties: {
        /**
         * Property: model
         * Record backing this card
         *
         * Every card is backed by a record in the database.
         * A card's record is represented by a <ContentObjectModel> or one of
         * its subclasses.
         *
         * Type:
         *   <ContentObjectModel>
         *
         * Flags:
         *   Construct only
         */
        'model': GObject.ParamSpec.object('model', 'Model',
            'Card model with which to create this card',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            ContentObjectModel.ContentObjectModel),
        /**
         * Property: page-number
         *
         * Page number of the cards model, within the context of the app. Must
         * be a human readable (starting from 1) integer. A value of zero means
         * the model has no page number inside the app.
         */
        'page-number': GObject.ParamSpec.uint('page-number', 'Page Number',
            'Page Number of the article within the current set of articles',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            0, GLib.MAXUINT32, 0),
        /**
         * Property: title-capitalization
         * Manner in which the card's title is formatted
         *
         * This property is a temporary stand-in for achieving this via the CSS
         * *text-transform* property.
         */
        'title-capitalization': GObject.ParamSpec.enum('title-capitalization',
            'Title capitalization', 'Manner in which the title is formatted',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            EosKnowledgePrivate.TextTransformType,
            EosKnowledgePrivate.TextTransform.NONE),
    },

    set css (v) {
        if (this._css === v)
            return;
        this._css = v;
        if (this._css) {
            Utils.apply_css_to_widget(this._css, this);
        }
        this.notify('css');
    },

    get css () {
        if (this._css)
            return this._css;
        return '';
    },

    // Overridable in tests; otherwise keep synchronized with the CSS
    FADE_IN_TIME_MS: 1000,
    NUM_STYLE_VARIANTS: 3,

    /**
     * Method: set_label_or_hide
     *
     * Sets a label contents and hides if contents is empty.
     */
    set_label_or_hide: function (label, text) {
        label.label = GLib.markup_escape_text(text, -1);
        label.visible = !!text;
    },

    /**
     * Method: set_thumbnail_frame_from_model
     *
     * Sets up a frame to show the model's thumbnail uri.
     */
    set_thumbnail_frame_from_model: function (frame) {
        frame.visible = false;
        if (!this.model.thumbnail_uri)
            return;

        let scheme = Gio.File.new_for_uri(this.model.thumbnail_uri).get_uri_scheme();
        // FIXME: to actually support ekn uris here, we'd need a gvfs
        // extension or something like that
        if (scheme === 'ekn')
            return;

        let frame_css = '* { background-image: url("' + this.model.thumbnail_uri + '"); }';
        if (!this._background_provider) {
            this._background_provider = new Gtk.CssProvider();
            let context = frame.get_style_context();
            context.add_provider(this._background_provider,
                Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
        }
        this._background_provider.load_from_data(frame_css);
        frame.visible = true;
    },

    /**
     * Method: set_title_label_from_model
     *
     * Sets up a label to show the model's title.
     */
    set_title_label_from_model: function (label) {
        this.set_label_or_hide(label,
            Utils.format_capitals(this.model.title, this.title_capitalization));
    },

    /**
     * Method: set_author_label_from_model
     *
     * Sets up a label to show the model's authors.
     */
    set_author_label_from_model: function (label) {
        this.set_label_or_hide(label, Utils.format_authors(this.model.authors));
    },

    /**
     * Method: set_style_variant_from_model
     * Uses the article number to set a style variant CSS class
     *
     * Adds one of the CSS classes 'variant0', 'variant1', or 'variant2' to the
     * card, depending on the <ArticleObjectModel.article_number> property if it
     * is present.
     */
    set_style_variant_from_model: function () {
        if (this.model.article_number !== undefined) {
            let style = this.model.article_number % this.NUM_STYLE_VARIANTS;
            this.get_style_context().add_class('variant' + style);
        }
    },

    /**
     * Method: update_card_sizing_classes
     * Assigns the appropriate CSS classes based on the height and width
     *
     * This method takes the height and width of the card widget and assigns the
     * appropriate CSS classes, according to our design constraints.
     */
    update_card_sizing_classes: function (height, width) {
        let width_class, height_class;

        if (width < 200) {
            width_class = StyleClasses.CARD_WIDTH.A;
        } else if (width < 300) {
            width_class = StyleClasses.CARD_WIDTH.B;
        } else if (width < 400) {
            width_class = StyleClasses.CARD_WIDTH.C;
        } else if (width < 600) {
            width_class = StyleClasses.CARD_WIDTH.D;
        } else if (width < 800) {
            width_class = StyleClasses.CARD_WIDTH.E;
        } else if (width < 1000) {
            width_class = StyleClasses.CARD_WIDTH.F;
        } else if (width < 1200) {
            width_class = StyleClasses.CARD_WIDTH.G;
        } else {
            width_class = StyleClasses.CARD_WIDTH.H;
        }

        if (height < 200) {
            height_class = StyleClasses.CARD_HEIGHT.A;
        } else if (height < 300) {
            height_class = StyleClasses.CARD_HEIGHT.B;
        } else if (height < 400) {
            height_class = StyleClasses.CARD_HEIGHT.C;
        } else if (height < 600) {
            height_class = StyleClasses.CARD_HEIGHT.D;
        } else {
            height_class = StyleClasses.CARD_HEIGHT.E;
        }

        let context = this.get_style_context();
        if (typeof width_class !== undefined && !context.has_class(width_class)) {
            Object.keys(StyleClasses.CARD_WIDTH).forEach(name => context.remove_class(StyleClasses.CARD_WIDTH[name]));
            context.add_class(width_class);
        }

        if (typeof width_class !== undefined && !context.has_class(height_class)) {
            Object.keys(StyleClasses.CARD_HEIGHT).forEach(name => context.remove_class(StyleClasses.CARD_HEIGHT[name]));
            context.add_class(height_class);
        }
    },

    /**
     * Method: fade_in
     * Use instead of *Gtk.Widget.show()* or *Gtk.Widget.show_all()*.
     */
    fade_in: function () {
        let context = this.get_style_context();
        context.add_class(StyleClasses.INVISIBLE);
        // FIXME: for some reason even if initial opacity = 0 in css, the
        // opacity will start at 1. Triggering a 'notify' on opacity seems to
        // get the actual initial opacity value in css to be respected
        this.opacity = 0;
        this.opacity = 1;
        // Cards not sensitive till fully faded in
        this.sensitive = false;
        Mainloop.timeout_add(this.FADE_IN_TIME_MS, () => {
            this.sensitive = true;
            context.remove_class(StyleClasses.INVISIBLE);
            context.remove_class(StyleClasses.FADE_IN);
            return GLib.SOURCE_REMOVE;
        });
        this.show();
        context.add_class(StyleClasses.FADE_IN);
    },
});
