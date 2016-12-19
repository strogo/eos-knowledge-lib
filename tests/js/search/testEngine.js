const Engine = imports.search.engine;
const InstanceOfMatcher = imports.tests.InstanceOfMatcher;

describe('Engine', function () {
    let engine;
    let mock_domain;

    beforeEach(function () {
        jasmine.addMatchers(InstanceOfMatcher.customMatchers);
        engine = new Engine.Engine();
        engine.default_app_id = 'foo';

        mock_domain = {
            get_object_by_id: jasmine.createSpy(),
            get_object_by_id_finish: jasmine.createSpy(),
        };
        spyOn(engine, '_get_domain').and.returnValue(mock_domain);
    });

    describe('domain wrap behavior', function () {
        it('calls get_object_by_id correctly', function (done) {
            mock_domain.get_object_by_id.and.callFake(function (id, cancellable, callback) {
                callback(mock_domain, 'testing whether this was called');
            });
            mock_domain.get_object_by_id_finish.and.callFake(function (task) {
                return task;
            });

            engine.get_object_by_id('ekn:///1234567890abcdef', null, function (engine, task) {
                let res = engine.get_object_by_id_finish(task);
                expect(res).toEqual('testing whether this was called');
                expect(mock_domain.get_object_by_id).toHaveBeenCalled();
                done();
            });
        });
    });
});
