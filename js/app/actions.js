// Copyright 2015 Endless Mobile, Inc.

// UI event actions, avoid updating other module UI from these, they will be
// processed by the interaction models.
const NAV_BACK_CLICKED = 'nav-back-clicked';
const NAV_FORWARD_CLICKED = 'nav-forward-clicked';
const HISTORY_BACK_CLICKED = 'history-back-clicked';
const HISTORY_FORWARD_CLICKED = 'history-forward-clicked';
const SET_CLICKED = 'set-clicked';
const ITEM_CLICKED = 'item-clicked';
const SEARCH_CLICKED = 'search-clicked';
const HOME_CLICKED = 'home-clicked';
const ALL_SETS_CLICKED = 'all-sets-clicked';
const PREVIOUS_DOCUMENT_CLICKED = 'previous-document-clicked';
const NEXT_DOCUMENT_CLICKED = 'next-document-clicked';
const SEARCH_TEXT_ENTERED = 'search-text-entered';
const AUTOCOMPLETE_CLICKED = 'autocomplete-clicked';
const ARTICLE_LINK_CLICKED = 'article-link-clicked';
const NEED_MORE_SETS = 'need-more-sets';
const NEED_MORE_ITEMS = 'need-more-items';
const NEED_MORE_SEARCH = 'need-more-search';
const NEED_MORE_CONTENT = 'need-more-content';
const CONTENT_ADDED = 'content-added';
const ARTICLE_LOAD_FAILED = 'article-load-failed';
const LEAVE_PREVIEW_CLICKED = 'leave-preview-clicked';

// UI updating actions, generated by the interaction models. Modules
// should listen to these to update their appearance.
const NAV_BACK_ENABLED_CHANGED = 'nav-back-enabled-changed';
const NAV_FORWARD_ENABLED_CHANGED = 'nav-forward-enabled-changed';
const HISTORY_BACK_ENABLED_CHANGED = 'history-back-enabled-changed';
const HISTORY_FORWARD_ENABLED_CHANGED = 'history-back-forward-changed';
const HIGHLIGHT_ITEM = 'highlight-item';
const CLEAR_HIGHLIGHTED_ITEM = 'clear-highlighted-item';
const APPEND_SETS = 'append-sets';
const APPEND_ITEMS = 'append-items';
const APPEND_SEARCH = 'append-search';
const MODULE_READY = 'module-ready';
const NEED_MORE_SUGGESTED_ARTICLES = 'need-more-suggested-articles';
const NEED_MORE_SUPPLEMENTARY_ARTICLES = 'need-more-supplementary-articles';
const APPEND_SUGGESTED_ARTICLES = 'append-suggested-articles';
const APPEND_SUPPLEMENTARY_ARTICLES = 'append-supplementary-articles';
const CLEAR_SUGGESTED_ARTICLES = 'clear-suggested-articles';
const CLEAR_SUPPLEMENTARY_ARTICLES = 'clear-supplementary-articles';
const CLEAR_SETS = 'clear-sets';
const CLEAR_ITEMS = 'clear-items';
const CLEAR_SEARCH = 'clear-search';
const SEARCH_STARTED = 'search-started';
const SEARCH_READY = 'search-ready';
const SEARCH_FAILED = 'search-failed';
const SET_SEARCH_TEXT = 'set-search-text';
const SHOW_SET = 'show-set';
const SET_READY = 'set-ready';
const SHOW_ARTICLE = 'show-article';
const SHOW_MEDIA = 'show-media';
const HIDE_MEDIA = 'hide-media';
const SHOW_ARTICLE_SEARCH = 'show-article-search';
const HIDE_ARTICLE_SEARCH = 'hide-article-search';
const FOCUS_SEARCH = 'focus-search';
const SHOW_BRAND_PAGE = 'show-brand-page';
const SHOW_HOME_PAGE = 'show-home-page';
const SHOW_ALL_SETS_PAGE = 'show-all-sets-page';
const SHOW_SECTION_PAGE = 'show-section-page';
const SHOW_SEARCH_PAGE = 'show-search-page';
const SHOW_ARTICLE_PAGE = 'show-article-page';
const SHOW_FRONT_PAGE = 'show-front-page';
const SHOW_BACK_PAGE = 'show-back-page';
const SHOW_ARCHIVE_PAGE = 'show-archive-page';
const SHOW_STANDALONE_PAGE = 'show-standalone-page';
const PRESENT_WINDOW = 'present-window';
const FILTER_SETS = 'filter-sets';
const FEATURE_ITEM = 'feature-item';
