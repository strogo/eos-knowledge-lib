// Copyright 2014 Endless Mobile, Inc.

const EosKnowledgePrivate = imports.gi.EosKnowledgePrivate;
const Gettext = imports.gettext;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Pango = imports.gi.Pango;

const Config = imports.app.config;
const CardA = imports.app.cardA;

let _ = Gettext.dgettext.bind(null, Config.GETTEXT_PACKAGE);

const PDF_ICON = '/com/endlessm/knowledge/pdf_icon.png';

/**
 * Class: pdfCard
 *
 * This card represents an article and a PDF icon.
 *
 * Extends:
 *   <CardA>
 */
const PdfCard = new Lang.Class({
    Name: 'PdfCard',
    GTypeName: 'EknPdfCard',
    Extends: CardA.CardA,

    _init: function (props) {
        this.parent(props);
    },

    pack_widgets: function (title_label, synopsis_label, image_frame) {
        title_label.lines = 2;
        title_label.hexpand = true;
        title_label.xalign = 0;

        let pdf_icon = new Gtk.Image({
            resource: PDF_ICON,
        });
        let pdf_label = new Gtk.Label({
            label: _('PDF'),
            hexpand: true,
            xalign: 0,
        });
        pdf_icon.get_style_context().add_class(EosKnowledgePrivate.STYLE_CLASS_PDF_CARD_ICON);
        pdf_label.get_style_context().add_class(EosKnowledgePrivate.STYLE_CLASS_PDF_CARD_LABEL);

        let grid = new Gtk.Grid();
        grid.attach(title_label, 0, 0, 2, 1);
        grid.attach(pdf_icon, 0, 1, 1, 1);
        grid.attach(pdf_label, 1, 1, 1, 1);
        this.add(grid);

        this.setSensitiveChildren([title_label, pdf_icon, pdf_label]);
    },
});
