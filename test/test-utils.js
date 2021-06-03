"use strict";

const Test = require("tape");
const Utils = require("../lib/utils");

Test("utils", function (t) {
    t.test("prefix", function (t) {
        t.plan(3);

        var str = "foobar";

        str = Utils.prefix(str, "foo");

        t.equal(str, "foobar", "string had prefix so is the same.");

        str = "bar";

        str = Utils.prefix(str, "foo");

        t.equal(str, "foobar", "string did not have prefix so was changed.");

        t.equal(Utils.prefix(undefined, "foo"), "foo", "handled undefined.");
    });

    t.test("unprefix", function (t) {
        t.plan(3);

        var str = "foobar";

        str = Utils.unprefix(str, "foo");

        t.equal(str, "bar", "string had prefix so is changed.");

        str = "bar";

        str = Utils.unprefix(str, "foo");

        t.equal(str, "bar", "string did not have prefix so was not changed.");

        t.equal(Utils.unprefix(undefined, "foo"), "", "handled undefined.");
    });

    t.test("suffix", function (t) {
        t.plan(3);

        var str = "foobar";

        str = Utils.suffix(str, "bar");

        t.equal(str, "foobar", "string had suffix so is the same.");

        str = "foo";

        str = Utils.suffix(str, "bar");

        t.equal(str, "foobar", "string did not have suffix so was changed.");

        t.equal(Utils.suffix(undefined, "foo"), "foo", "handled undefined.");
    });

    t.test("unsuffix", function (t) {
        t.plan(3);

        var str = "foobar";

        str = Utils.unsuffix(str, "bar");

        t.equal(str, "foo", "string had suffix so is changed.");

        str = "foo";

        str = Utils.unsuffix(str, "bar");

        t.equal(str, "foo", "string did not have suffix so was not changed.");

        t.equal(Utils.unsuffix(undefined, "foo"), "", "handled undefined.");
    });

    t.test("ends with", function (t) {
        t.plan(2);
        t.ok(Utils.endsWith("foobar", "bar"), "foobar ends with bar");
        t.ok(!Utils.endsWith("foobar", "x"), "foobar doesn't end with x");
    });

    t.test("is httpMethod", function (t) {
        const verbs = Utils.verbs;

        t.plan(verbs.length + 1);

        for (const verb of verbs) {
            t.ok(Utils.isHttpMethod(verb), `${verb} is an http method.`);
        }

        t.ok(!Utils.isHttpMethod("Blerg"), "Blerg is not an http method.");
    });
});
