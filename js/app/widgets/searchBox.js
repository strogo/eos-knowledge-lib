const {Gdk, GObject, Gtk, Pango} = imports.gi;
const Gettext = imports.gettext;

const Config = imports.app.config;

const _ = Gettext.dgettext.bind(null, Config.GETTEXT_PACKAGE);

const BOX_WIDTH_CHARS = 25;
const MAX_RESULTS = 4;

const _AutocompleteItem = GObject.registerClass({
    CssName: 'cell',
}, class _AutocompleteItem extends Gtk.Grid {
    _init(props={}) {
        this._label = new Gtk.Label({visible: true});
        if ('title' in props) {
            this._label.label = props.title;
            delete props.title;
        }

        if ('id' in props) {
            this.id = props.id;
            delete props.id;
        }

        props.no_show_all = true;
        super._init(props);

        const icon = new Gtk.Image({
            icon_name: 'go-next-symbolic',
            icon_size: Gtk.IconSize.BUTTON,
            visible: true,
        });
        this.attach(this._label, 0, 0, 1, 1);
        this.attach(icon, 1, 0, 1, 1);
    }

    get title() { return this._label.label; }
    set title(value) {
        this._label.label = value;
        this.visible = !!value;
    }
});

/**
 * Class: SearchBox
 *
 * This is a search box with autocompletion functionality.
 * The primary icon is a magnifying glass and the cursor turns into a hand when
 * hovering over the icon.
 *
 * NOTE: Due to a limitation in GTK, the cursor change will not work if the
 * search box's alignment is set to Gtk.Align.FILL in either direction.
 *
 */
var SearchBox = GObject.registerClass({
    GTypeName: 'EknSearchBox',
    Signals: {
        /**
         * Event: menu-item-selected
         *
         * This event is triggered when an item is selected from the autocomplete menu.
         */
        'menu-item-selected': {
            param_types: [GObject.TYPE_STRING]
        },
        /**
         * Signal: more-activated
         * Emitted when the "See more results" item is activated.
         */
        'more-activated': {},
        /**
         * Event: text-changed
         *
         * This event is triggered when the text in the search entry is changed by the user.
         */
        'text-changed': {
            param_types: [GObject.TYPE_STRING]
        }
    },
}, class SearchBox extends Gtk.Entry {
    _init(props={}) {
        if (['width_chars', 'width-chars', 'widthChars'].every(name =>
            typeof props[name] === 'undefined')) {
            props.width_chars = BOX_WIDTH_CHARS;
        }
        props.primary_icon_name = 'edit-find-symbolic';
        super._init(props);

        this.connect('icon-press', () => this.emit('activate'));
        this.connect('changed', () => {
            if (!this._entry_changed_by_widget) {
                // If there is entry text, need to add the 'go' icon and allow
                // the icons to prelight
                if (this.text) {
                    this.secondary_icon_name = 'go-next-symbolic';
                    this.get_style_context().add_class('text-entered');
                } else {
                    this.secondary_icon_name = null;
                    this.get_style_context().remove_class('text-entered');
                }
                this.emit('text-changed', this.text);
            }
            this._entry_changed_by_widget = false;
        });
        this.connect('enter-notify-event', this._on_motion.bind(this));
        this.connect('motion-notify-event', this._on_motion.bind(this));
        this.connect('leave-notify-event', this._on_leave.bind(this));

        this._popover = new Gtk.Popover({
            constrain_to: Gtk.PopoverConstraint.NONE,
            modal: false,
            position: Gtk.PositionType.BOTTOM,
            relative_to: this,
        });
        this._popover.get_style_context().add_class('autocomplete');
        const listbox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
            visible: true,
        });
        this._popover.add(listbox);
        this._items = Array(MAX_RESULTS).fill().map(() => new _AutocompleteItem());
        this._see_more = new _AutocompleteItem({
            title: _('See more results'),
            visible: true,
        });
        this._items.forEach(item => listbox.add(item));
        listbox.add(this._see_more);
        listbox.connect('row-activated', (box, row) => {
            const item = row.get_child();
            if (item === this._see_more)
                this.emit('more-activated');
            else
                this.emit('menu-item-selected', item.id);
        });
    }

    _on_motion(widget, event) {
        // Workaround for https://gitlab.gnome.org/GNOME/gtk/issues/196
        this.get_style_context().add_class('fake-hover');

        // Don't change the mouse cursor if clicking on the icon will not do
        // anything because there's no text entered
        if (!this.text)
            return Gtk.EVENT_PROPAGATE;

        const [has_coords, x, y] = event.get_root_coords();
        if (!has_coords)
            return Gdk.EVENT_PROPAGATE;

        let top = this.get_toplevel();
        if (!top.is_toplevel())
            return Gdk.EVENT_PROPAGATE;
        const [realized, entry_x, entry_y] = top.translate_coordinates(this, x, y);
        if (!realized)
            return Gdk.EVENT_PROPAGATE;

        const on_icon = this.get_icon_at_pos(entry_x, entry_y);
        const has_secondary = this.secondary_icon_name !== null;

        if (on_icon === 0 || (has_secondary && on_icon === 1)) {
            if (this._has_hand_cursor)
                return Gdk.EVENT_PROPAGATE;
            let cursor = Gdk.Cursor.new_from_name(this.get_display(), 'pointer');
            this.window.set_cursor(cursor);
            this._has_hand_cursor = true;
        } else {
            this._remove_hand_cursor();
        }
        return Gdk.EVENT_PROPAGATE;
    }

    _remove_hand_cursor() {
        if (!this._has_hand_cursor)
            return;
        this.window.set_cursor(null);
        this._has_hand_cursor = false;
    }

    _on_leave(widget) {
        // Workaround for https://gitlab.gnome.org/GNOME/gtk/issues/196
        this.get_style_context().remove_class('fake-hover');
        this._remove_hand_cursor();
        return Gdk.EVENT_PROPAGATE;
    }

    /* Set the entry text without triggering the text-changed signal.
    */
    set_text_programmatically(text) {
        if (this.text === text)
            return;
        this._entry_changed_by_widget = true;
        this.text = text;
        this.set_position(-1);
    }

    /* Set the menu items by providing an array of item objects:
        [
            {
                'title': 'Frango',
                'id': 'http://www.myfrango.com'
            }
        ]

        'title' must be a string but 'id' can be any type and is used to
        identify the data that was selected.
    */
    set_menu_items(items) {
        if (items.length === 0) {
            this._popover.popdown();
            return;
        }

        items.slice(0, MAX_RESULTS).forEach(({title, id}, ix) => {
            this._items[ix].title = title;
            this._items[ix].id = id;
        });
        for (let ix = items.length; ix < MAX_RESULTS; ix++)
            this._items[ix].title = this._items[ix].id = '';

        this._see_more.visible = (items.length >= MAX_RESULTS);
        this._popover.popup();

        this._entry_changed_by_widget = true;
        this.emit('changed');
    }
});
