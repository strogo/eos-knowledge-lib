// Copyright 2014 Endless Mobile, Inc.

const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Format = imports.format;
const Gettext = imports.gettext;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ListCard = imports.app.listCard;
const Config = imports.app.config;

String.prototype.format = Format.format;
let _ = Gettext.dgettext.bind(null, Config.GETTEXT_PACKAGE);
GObject.ParamFlags.READWRITE = GObject.ParamFlags.READABLE | GObject.ParamFlags.WRITABLE;

/**
 * Class: ProgressCard
 *
 * This card represents a group of cards in a sequence that can be completed or
 * "checked off."
 * It has two properties, <total-items> and <completed-items>, which can be used
 * to figure the percentage done.
 *
 * Extends:
 *   <ListCard>
 */
const ProgressCard = new Lang.Class({
    Name: 'ProgressCard',
    GTypeName: 'EknProgressCard',
    Extends: ListCard.ListCard,
    Properties: {
        /**
         * Property: total-items
         *
         * The number of completable items represented by this card.
         * If set to 0, then the number will not be displayed.
         *
         * Flags:
         *   Construct only
         */
        'total-items': GObject.ParamSpec.uint('total-items', 'Total items',
            'Number of completable items in total',
            GObject.ParamFlags.READWRITE | GObject.ParamFlags.CONSTRUCT_ONLY,
            0, GLib.MAXUINT32, 0),
        /**
         * Property: completed-items
         *
         * The number of completed items out of <total-items>.
         */
        'completed-items': GObject.ParamSpec.uint('completed-items',
            'Completed items', 'Number of completed items',
            GObject.ParamFlags.READWRITE,
            0, GLib.MAXUINT32, 0)
    },

    _init: function (props) {
        this._total = 0;
        this._complete = 0;

        this._progress = new Gtk.ProgressBar({
            halign: Gtk.Align.CENTER,
            valign: Gtk.Align.CENTER,
            show_text: true,
            no_show_all: true
        });
        this._progress.get_style_context().add_class('FIXME-private-progress');

        this.parent(props);
    },

    pack_widgets: function (title_label, synopsis_label, image_frame) {
        let grid = new Gtk.Grid({
            orientation: Gtk.Orientation.VERTICAL
        });
        grid.add(this._progress);
        grid.add(title_label);
        grid.add(synopsis_label);
        this.add(grid);

        this.setSensitiveChildren([title_label, synopsis_label,
            this._progress]);
    },

    get total_items() {
        return this._total;
    },

    set total_items(value) {
        this._total = value;
        this._update_bar();
    },

    get completed_items() {
        return this._complete;
    },

    set completed_items(value) {
        this._complete = Math.min(value, this._total);
        this._update_bar();
    },

    // Private

    _update_bar: function () {
        if (this._total > 0 && this._complete === this._total)
            this.get_style_context().add_class(EosKnowledgePrivate.STYLE_CLASS_COMPLETE);
        else
            this.get_style_context().remove_class(EosKnowledgePrivate.STYLE_CLASS_COMPLETE);

        this._progress.text = _("%d of %d done").format(this._complete,
            this._total);
        if (this._total > 0) {
            this._progress.fraction = this._complete / this._total;
            this._progress.show();
        } else {
            this._progress.hide();
        }
    }
});
