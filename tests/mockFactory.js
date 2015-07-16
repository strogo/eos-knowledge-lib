const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const MockFactory = new Lang.Class({
    Name: 'MockFactory',
    Extends: GObject.Object,

    _init: function (props={}) {
        this.parent(props);
        this._mock_classes = {};
        this._created_mocks = {};
    },

    create_named_module: function (name, props) {
        this._created_mocks[name] = this._created_mocks[name] || [];
        if (this._mock_classes.hasOwnProperty(name)) {
            let retval = new this._mock_classes[name](props);
            this._created_mocks[name].push(retval);
            return retval;
        }
        let retval = new Gtk.Label();
        this._created_mocks[name].push(retval);
        return retval;
    },

    add_named_mock: function (name, klass) {
        this._mock_classes[name] = klass;
    },

    get_created_named_mocks: function (name) {
        return this._created_mocks[name] || [];
    },
});
