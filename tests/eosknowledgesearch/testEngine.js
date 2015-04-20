const EosKnowledgeSearch = imports.EosKnowledgeSearch;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const InstanceOfMatcher = imports.InstanceOfMatcher;
const utils = imports.tests.utils;

const TEST_CONTENT_DIR = utils.get_test_content_srcdir();
const MOCK_CONTENT_PATH = TEST_CONTENT_DIR + 'content-search-results.jsonld';
const MOCK_ARTICLE_PATH = TEST_CONTENT_DIR + 'article-search-results.jsonld';
const MOCK_MEDIA_PATH = TEST_CONTENT_DIR + 'media-search-results.jsonld';

describe('Knowledge Engine Module', () => {
    let engine;
    let noop = function () {};

    const MOCK_CONTENT_RESULTS = utils.parse_object_from_path(MOCK_CONTENT_PATH);
    const MOCK_ARTICLE_RESULTS = utils.parse_object_from_path(MOCK_ARTICLE_PATH);
    const MOCK_MEDIA_RESULTS = utils.parse_object_from_path(MOCK_MEDIA_PATH);

    // Setup a spy in place of the Soup-based request function
    function engine_request_spy() {
        let mock_request = jasmine.createSpy('request');
        engine._send_json_ld_request = mock_request;
        return mock_request;
    }

    // Setup a mocked request function which just returns the mock data
    function mock_engine_request(mock_err, mock_data) {
        engine._send_json_ld_request = (req, callback) => {
            callback(mock_err, mock_data);
        }
    }

    function mock_engine_request_with_multiple_values(return_values) {
        engine._send_json_ld_request = (req, callback) => {
            callback(undefined, return_values.shift());
        }
    }

    // where querystring is the URI component after a '?', and key is the
    // name of a query parameter, return the value(s) for that parameter
    // e.g.:
    //   get_query_vals_for_key('foo=bar', 'foo') => 'bar'
    //   get_query_vals_for_key('foo=bar&foo=baz', 'foo') => ['bar', 'baz']
    function get_query_vals_for_key (querystring, key) {
        let results = querystring.split('&').filter((pair) => {
            return pair.indexOf(key + '=') === 0;
        }).map((pair) => {
            return decodeURIComponent(pair.split('=')[1]);
        });

        if (results.length === 1)
            return results[0];
        return results;
    }

    beforeEach(() => {
        jasmine.addMatchers(InstanceOfMatcher.customMatchers);
        engine = new EosKnowledgeSearch.Engine();
        engine.default_domain = 'foo';

        // Inject a custom content path finder so we don't hit the disk ever.
        engine._content_path_from_domain = function(domain) {
            // The rule for our test suite is that domain 'foo' gets
            // the content-path /foo'.
            return '/' + domain;
        };
    });

    describe('constructor', () => {
        it('should default its port to 3004', () => {
            expect(engine.port).toBe(3004);
        });

        it('should default its hostname to 127.0.0.1', () => {
            expect(engine.host).toBe('127.0.0.1');
        });
    });

    describe('HTTP requests', () => {
        beforeEach(() => {
            // spy on the queue_message and cancel_message methods
            spyOn(engine._http_session, 'queue_message').and.callFake((req, cb) => {
                cb();
            });
            spyOn(engine._http_session, 'cancel_message');
        });

        it('can be cancelled', () => {
            let cancellable = new Gio.Cancellable();
            engine.get_object_by_id('ekn://foo/0123456789abcdef', noop, cancellable);
            cancellable.cancel();
            expect(engine._http_session.cancel_message).toHaveBeenCalled();
            let message = engine._http_session.cancel_message.calls.mostRecent().args[0];
            // Make sure we are canceling the right Soup Message
            expect(message).toBeA(Soup.Message);
            expect(message.uri.to_string(true)).toMatch('0123456789abcdef');
        });

        it('does not make a request if already cancelled', () => {
            let cancellable = new Gio.Cancellable();
            cancellable.cancel();
            engine.get_object_by_id('ekn://foo/0123456789abcdef', noop, cancellable);
            expect(engine._http_session.queue_message).not.toHaveBeenCalled();
        });
    });

    describe('_parse_json_ld_message utility method', () => {
        it('replaces old-style EKN ids', () => {
            let json_without_api = JSON.stringify({
                '@id': 'http://localhost:3003/foo/bar',
            });
            let json_with_api = JSON.stringify({
                '@id': 'http://localhost:3003/api/foo/bar',
            });

            expect(engine._parse_json_ld_message(json_with_api)['@id'])
            .toEqual('ekn://foo/bar');

            expect(engine._parse_json_ld_message(json_without_api)['@id'])
            .toEqual('ekn://foo/bar');
        });
    });

    describe('get_xapian_uri', () => {
        it('sets collapse to 0', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion',
            });

            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            expect(get_query_vals_for_key(mock_query_obj, 'collapse')).toEqual('0');
        });

        it('sets order field', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion',
                order: EosKnowledgeSearch.QueryObjectOrder.ASCENDING,
            });

            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            expect(get_query_vals_for_key(mock_query_obj, 'order')).toEqual('asc');
        });

        it('should use the lang param iff a language is set', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion',
            });

            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            expect(get_query_vals_for_key(mock_query_obj, 'lang')).toEqual([]);

            engine.language = 'en';
            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            expect(get_query_vals_for_key(mock_query_obj, 'lang')).toEqual('en');
        });

        it('sets path correctly', () => {
            let path, uri, query_obj;
            let query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion',
            });

            uri = engine._get_xapian_uri(query_obj);
            query_obj = uri.get_query();
            expect(get_query_vals_for_key(query_obj, 'path')).toEqual('/foo/db');
        });

        it('sets tags correctly', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion wins',
                tags: ['lannister', 'bro'],
                offset: 5,
                limit: 2,
            });
            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            let serialized_query = get_query_vals_for_key(mock_query_obj, 'q');
            expect(serialized_query).toMatch('tag:"lannister"');
            expect(serialized_query).toMatch('tag:"bro"');
        });

        it('includes query words in xapian query clause', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion wins',
                tags: ['lannister', 'bro'],
                offset: 5,
                limit: 2,
            });
            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            let serialized_query = get_query_vals_for_key(mock_query_obj, 'q');

            expect(serialized_query).toMatch(/tyrion/i);
            expect(serialized_query).toMatch(/wins/i);
        });

        it('changes cutoff value depending on query match', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion wins',
                match: EosKnowledgeSearch.QueryObjectMatch.TITLE_SYNOPSIS,
            });
            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            let serialized_cutoff = get_query_vals_for_key(mock_query_obj, 'cutoff');
            expect(serialized_cutoff).toBe('20');

            query_obj = new EosKnowledgeSearch.QueryObject({
                query: 'tyrion wins',
                match: EosKnowledgeSearch.QueryObjectMatch.TITLE_ONLY,
            });
            mock_uri = engine._get_xapian_uri(query_obj);
            mock_query_obj = mock_uri.get_query();
            serialized_cutoff = get_query_vals_for_key(mock_query_obj, 'cutoff');
            expect(serialized_cutoff).toBe('10');
        });

        it('supports single ID queries', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                ids: ['ekn://domain/0123456789abcdef'],
            });
            let query_params = {
                query: '(id:0123456789abcdef)',
            };

            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            expect(get_query_vals_for_key(mock_query_obj, 'q'));
        });

        it('supports multiple ID queries', () => {
            let query_obj = new EosKnowledgeSearch.QueryObject({
                ids: [
                    'ekn://domain/0123456789abcdef',
                    'ekn://domain/fedcba9876543210',
                ],
            });
            let expected_vals = '(id:0123456789abcdef OR id:fedcba9876543210)';

            let mock_uri = engine._get_xapian_uri(query_obj);
            let mock_query_obj = mock_uri.get_query();
            expect(get_query_vals_for_key(mock_query_obj, 'q')).toEqual(expected_vals);
        });
    });

    describe('serialize_query', () => {
        it('correctly serializes query args', () => {
            let query_args = {
                path: '/foo',
                query: 'bar',
                offset: 5,
            };
            expect(engine._serialize_query(query_args)).toEqual('path=%2Ffoo&query=bar&offset=5');

            query_args = {
                slarty: 'thing@with@ats',
                bartfast: 'this=that',
            };
            expect(engine._serialize_query(query_args)).toEqual('slarty=thing%40with%40ats&bartfast=this%3Dthat');
        });
    });


    describe('get_object_by_id', () => {
        it('sends requests', () => {
            let request_spy = engine_request_spy();
            let mock_id = 'ekn://foo/0123456789abcdef';

            engine.get_object_by_id(mock_id, noop);
            expect(request_spy).toHaveBeenCalled();
        });

        it('sends correct request URIs', () => {
            let request_spy = engine_request_spy();
            let mock_id = 'ekn://foo/0123456789abcdef';
            let mock_id_query = '(id:0123456789abcdef)';

            engine.get_object_by_id(mock_id, noop);
            let last_req_args = request_spy.calls.mostRecent().args;
            let requested_uri = last_req_args[0];
            let requested_query = requested_uri.get_query();
            let requested_uri_string = requested_uri.to_string(false);

            expect(requested_uri_string).toMatch(/^http:\/\/127.0.0.1:3004\/query?/);
            expect(get_query_vals_for_key(requested_query, 'path')).toMatch('/foo');
            expect(get_query_vals_for_key(requested_query, 'q')).toMatch(mock_id_query);
        });

        it('marshals objects based on @type', (done) => {
            let mock_id = 'ekn://foo/0123456789abcdef';
            mock_engine_request(undefined, {
                'results': [{
                    "@id": mock_id,
                    "@type": "ekn://_vocab/ArticleObject",
                    "synopsis": "NOW IS THE WINTER OF OUR DISCONTENT"
                }]
            });

            engine.get_object_by_id(mock_id, (err, res) => {
                expect(err).not.toBeDefined();
                expect(res).toBeA(EosKnowledgeSearch.ArticleObjectModel);
                expect(res.synopsis).toBe("NOW IS THE WINTER OF OUR DISCONTENT");
                done();
            });
        });

        it('correctly sets media path on models', (done) => {
            let mock_id = 'ekn://foo/0123456789abcdef';
            mock_engine_request(undefined, {
                'results': [{
                    "@id": mock_id,
                    "@type": "ekn://_vocab/ContentObject",
                    "contentURL": "alligator.jpg",
                }]
            });

            engine.get_object_by_id(mock_id, (err, res) => {
                expect(res).toBeA(EosKnowledgeSearch.ContentObjectModel);
                expect(res.content_uri).toBe('file:///foo/media/alligator.jpg');
                done();
            });
        });

        it('does not call its callback more than once', (done) => {
            let mock_id = 'ekn://foo/0123456789abcdef';
            mock_engine_request(new Error('I am an error'), undefined);

            let callback_called = 0;
            engine.get_object_by_id(mock_id, (err, res) => {
                callback_called++;
            });
            setTimeout(done, 100); // pause for a moment for any more callbacks
            expect(callback_called).toEqual(1);
        });

        it('performs redirect resolution', (done) => {
            mock_engine_request_with_multiple_values([
                {
                    results: [{
                        '@id': 'ekn://foo/0123456789abcdef',
                        '@type': 'ekn://_vocab/ArticleObject',
                        redirectsTo: 'ekn://foo/fedcba9876543210',
                    }],
                },
                {
                    results: [{
                        '@id': 'ekn://foo/fedcba9876543210',
                        '@type': 'ekn://_vocab/ArticleObject',
                    }],
                },
            ]);
            engine.get_object_by_id('ekn://foo/0123456789abcdef', (err, thing) => {
                expect(thing.ekn_id).toEqual('ekn://foo/fedcba9876543210');
                done();
            });
        });

        it('handles 404 when fetching redirects', (done) => {
            mock_engine_request_with_multiple_values([
                {
                    results: [{
                        '@id': 'ekn://foo/0123456789abcdef',
                        '@type': 'ekn://_vocab/ArticleObject',
                        redirectsTo: 'ekn://foo/0000000000000000',
                    }],
                },
                {
                    results: [],
                },
            ]);
            engine.get_object_by_id('ekn://foo/0123456789abcdef', (err, thing) => {
                expect(err).toBeDefined();
                expect(thing).not.toBeDefined();
                done();
            });
        });
    });

    describe('get_objects_by_query', () => {

        it('sends requests', () => {
            let request_spy = engine_request_spy();
            let mock_query = new EosKnowledgeSearch.QueryObject({
                query: 'logorrhea',
            });

            engine.get_objects_by_query(mock_query, noop);
            expect(request_spy).toHaveBeenCalled();
        });

        it('requests correct URIs', () => {
            let request_spy = engine_request_spy();
            let mock_query = new EosKnowledgeSearch.QueryObject({
                query: 'logorrhea',
            });

            engine.get_objects_by_query(mock_query, noop);
            let last_req_args = request_spy.calls.mostRecent().args;
            let requested_uri = last_req_args[0];
            let requested_query = requested_uri.get_query();
            let requested_uri_string = requested_uri.to_string(false);

            expect(requested_uri_string).toMatch(/^http:\/\/127.0.0.1:3004\/query?/);
            expect(get_query_vals_for_key(requested_query, 'path')).toMatch('/foo');
            expect(get_query_vals_for_key(requested_query, 'q')).toMatch(/logorrhea/i);
        });

        it ("throws an error on unsupported JSON-LD type", (done) => {
            let notSearchResults = {
                "@type": "schema:Frobinator",
                "numResults": 1,
                "results": [
                    { "@type": "ekv:ArticleObject", "synopsis": "dolla dolla bill y'all" }
                ]
            };
            mock_engine_request(undefined, notSearchResults);

            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, results) => {
                expect(results).not.toBeDefined();
                expect(err).toBeDefined();
                done();
            });
        });

        it ("throws an error on unsupported search results", (done) => {
            let badObject = { "@type": "ekv:Kitten" };
            let resultsWithBadObject = {
                "@type": "ekv:SearchResults",
                "numResults": 1,
                "results": [ badObject ]
            };

            mock_engine_request(undefined, resultsWithBadObject);
            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, results) => {
                expect(results).not.toBeDefined();
                expect(err).toBeDefined();
                done();
            });
        });

        it ("resolves to a list of results if jsonld is valid", (done) => {
            mock_engine_request(undefined, MOCK_ARTICLE_RESULTS);

            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, results) => {
                expect(err).not.toBeDefined();
                expect(results).toBeDefined();
                done();
            });
        });

        it ("constructs a list of content objects based on @type", (done) => {
            mock_engine_request(undefined, MOCK_CONTENT_RESULTS);
            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, results) => {
                // All results in MOCK_CONTENT_OBJECT_RESULTS are of @type ContentObject,
                // so expect that they're constructed as such
                for (let i in results) {
                    expect(results[i]).toBeA(EosKnowledgeSearch.ContentObjectModel);
                }
                done();
            });
        });

        it ("constructs a list of article objects based on @type", (done) => {
            mock_engine_request(undefined, MOCK_ARTICLE_RESULTS);
            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, results) => {
                // All results in MOCK_ARTICLE_OBJECT_RESULTS are of @type ArticleObject,
                // so expect that they're constructed as such
                for (let i in results) {
                    expect(results[i]).toBeA(EosKnowledgeSearch.ArticleObjectModel);
                }
                done();
            });
        });

        it ("constructs a list of media objects based on @type", (done) => {
            mock_engine_request(undefined, MOCK_MEDIA_RESULTS);
            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, results) => {
                // All results in MOCK_MEDIA_OBJECT_RESULTS are of @type MediaObject,
                // so expect that they're constructed as such
                for (let i in results) {
                    expect(results[i]).toBeA(EosKnowledgeSearch.MediaObjectModel);
                }
                done();
            });
        });

        it('does not call its callback more than once', (done) => {
            mock_engine_request(new Error('I am an error'), undefined);

            let callback_called = 0;
            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, res) => {
                callback_called++;
            });
            setTimeout(done, 100); // pause for a moment for any more callbacks
            expect(callback_called).toEqual(1);
        });

        it('performs redirect resolution', (done) => {
            let get_objects_spy = spyOn(engine, 'get_objects_by_query').and.callThrough();
            // "aaaabbbbccccdddX" = redirect, "000000000000000X" = real
            mock_engine_request_with_multiple_values([
                {
                    results: [
                        {
                            '@id': 'ekn://foo/aaaabbbbccccddd2',
                            '@type': 'ekn://_vocab/ArticleObject',
                            redirectsTo: 'ekn://foo/aaaabbbbccccddd3',
                        },
                        {
                            '@id': 'ekn://foo/aaaabbbbccccddd1',
                            '@type': 'ekn://_vocab/ArticleObject',
                            redirectsTo: 'ekn://foo/0000000000000002',
                        },
                        {
                            '@id': 'ekn://foo/0000000000000003',
                            '@type': 'ekn://_vocab/ArticleObject',
                        },
                    ],
                },
                {
                    results: [
                        {
                            '@id': 'ekn://foo/aaaabbbbccccddd3',
                            '@type': 'ekn://_vocab/ArticleObject',
                            redirectsTo: 'ekn://foo/aaaabbbbccccddd4',
                        },
                        {
                            '@id': 'ekn://foo/0000000000000002',
                            '@type': 'ekn://_vocab/ArticleObject',
                        },
                    ],
                },
                {
                    results: [
                        {
                            '@id': 'ekn://foo/aaaabbbbccccddd4',
                            '@type': 'ekn://_vocab/ArticleObject',
                            redirectsTo: 'ekn://foo/0000000000000000',
                        },
                    ],
                },
                {
                    results: [
                        {
                            '@id': 'ekn://foo/0000000000000000',
                            '@type': 'ekn://_vocab/ArticleObject',
                        },
                    ],
                },
            ]);
            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, things) => {
                expect(things[0].ekn_id).toEqual('ekn://foo/0000000000000000');
                expect(things[1].ekn_id).toEqual('ekn://foo/0000000000000002');
                expect(things[2].ekn_id).toEqual('ekn://foo/0000000000000003');
                done();
            });
        });

        it('handles 404s when fetching redirects', (done) => {
            mock_engine_request_with_multiple_values([
                {
                    results: [
                        {
                            '@id': 'ekn://foo/0123456789abcdef',
                            '@type': 'ekn://_vocab/ArticleObject',
                            redirectsTo: 'ekn://foo/ffffffffffffffff',
                        },
                    ],
                },
                {
                    results: [],
                },
            ]);
            engine.get_objects_by_query(new EosKnowledgeSearch.QueryObject(), (err, things) => {
                expect(err).toBeDefined();
                expect(things).not.toBeDefined();
                done();
            });
        })
    });
});
