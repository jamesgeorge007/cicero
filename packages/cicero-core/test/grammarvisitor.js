/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const APModelManager = require('@accordproject/ergo-compiler').APModelManager;
const Logger = require('@accordproject/concerto-core').Logger;
const Writer = require('@accordproject/concerto-core').Writer;
const GrammarVisitor = require('../lib/grammarvisitor');
const ParserManager = require('../lib/parsermanager');
const nunjucks = require('nunjucks');

const fs = require('fs');
const path = require('path');

const chai = require('chai');
chai.should();
chai.use(require('chai-things'));
chai.use(require('chai-as-promised'));

nunjucks.configure({
    tags: {
        blockStart: '<%',
        blockEnd: '%>'
    },
    autoescape: false  // Required to allow nearley syntax strings
});
const ruleTemplate = `
<% for r in modelRules %>
{{ r.prefix }} -> <% for s in r.symbols -%>{{ s }} <% endfor %>
<% if r.properties %>
{% ( data ) => {
    return {
        $class: "{{ r.fqn }}",
        <%- for p in r.properties %>
        {{ p }}
        <%- endfor %>
    };
}
%}
<% endif %>
<% endfor %>`;

describe('GrammarVisitor', () => {

    describe('#visit', () => {

        it('should generate grammar from a modelmanager', async () => {

            const mm = new APModelManager();

            const timemodel = fs.readFileSync(path.resolve(__dirname, 'data/models', 'time.cto'), 'utf8');
            mm.addModelFile(timemodel, 'time.cto', true);

            const model = fs.readFileSync(path.resolve(__dirname, 'data/models', 'model.cto'), 'utf8');
            mm.addModelFile(model, 'model.cto', true);

            const test = fs.readFileSync(path.resolve(__dirname, 'data/models', 'test.cto'), 'utf8');
            mm.addModelFile(test, 'test.cto', true);

            await mm.updateExternalModels();
            mm.validateModelFiles();

            const writer = new Writer();
            const parameters = {
                writer: writer,
                rules: []
            };
            const gv = new GrammarVisitor();
            mm.accept(gv, parameters);

            const generatedGrammar = parameters.rules;
            generatedGrammar.should.not.be.empty;
            Logger.debug('Generated grammar', generatedGrammar);

            const combined = nunjucks.renderString(ruleTemplate, {modelRules: generatedGrammar});

            // check we can parse the generated grammar
            const ast = ParserManager.compileGrammar(combined);
            ast.should.not.be.null;
        });

        it('should generate grammar from a model with relationships', async () => {

            const mm = new APModelManager();
            if(mm.getModelFile('org.accordproject.common') === undefined){
                const model = fs.readFileSync(path.resolve(__dirname, 'data/models', 'common.cto'), 'utf8');
                mm.addModelFile(model, 'common.cto', true);
            }

            const timeModel = fs.readFileSync(path.resolve(__dirname, 'data/models', 'time.cto'), 'utf8');
            mm.addModelFile(timeModel, 'time.cto', true);

            const test = fs.readFileSync(path.resolve(__dirname, 'data/models', 'model.cto'), 'utf8');
            mm.addModelFile(test, 'model.cto', true);

            await mm.updateExternalModels();
            mm.validateModelFiles();

            const writer = new Writer();
            const parameters = {
                writer: writer,
                rules: []
            };
            const gv = new GrammarVisitor();
            mm.accept(gv, parameters);

            const generatedGrammar = parameters.rules;
            generatedGrammar.should.not.be.empty;
            Logger.debug('Generated grammar', generatedGrammar);

            const combined = nunjucks.renderString(ruleTemplate, {modelRules: generatedGrammar});

            // check we can parse the generated grammar
            const ast = ParserManager.compileGrammar(combined);
            ast.should.not.be.null;
        });

        it('should generate grammar from a model with optional fields', async () => {

            const mm = new APModelManager();
            if(mm.getModelFile('org.accordproject.common') === undefined){
                const model = fs.readFileSync(path.resolve(__dirname, 'data/models', 'common.cto'), 'utf8');
                mm.addModelFile(model, 'common.cto');
            }

            const test = fs.readFileSync(path.resolve(__dirname, 'data/conga/models', 'model.cto'), 'utf8');
            mm.addModelFile(test, 'model.cto', true);

            await mm.updateExternalModels();
            mm.validateModelFiles();

            const writer = new Writer();
            const parameters = {
                writer: writer,
                rules: []
            };
            const gv = new GrammarVisitor();
            mm.accept(gv, parameters);

            const generatedGrammar = parameters.rules;
            generatedGrammar.should.not.be.empty;
            Logger.debug('Generated grammar', generatedGrammar);

            const combined = nunjucks.renderString(ruleTemplate, {modelRules: generatedGrammar});

            // check we can parse the generated grammar
            const ast = ParserManager.compileGrammar(combined);
            ast.should.not.be.null;
        });

        it('should throw an error for unrecognized type', async () => {

            /* eslint-disable */
            class Thing {
                accept(visitor, parameters) {
                    visitor.visit(this,parameters);
                }
            }
            /* eslint-enable */
            const thing = new Thing();
            const gv = new GrammarVisitor();
            return (() => thing.accept(gv, {})).should.throw('Unrecognised type:');
        });
    });
});