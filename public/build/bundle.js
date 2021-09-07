
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }
    function attribute_to_object(attributes) {
        const result = {};
        for (const attribute of attributes) {
            result[attribute.name] = attribute.value;
        }
        return result;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    let SvelteElement;
    if (typeof HTMLElement === 'function') {
        SvelteElement = class extends HTMLElement {
            constructor() {
                super();
                this.attachShadow({ mode: 'open' });
            }
            connectedCallback() {
                const { on_mount } = this.$$;
                this.$$.on_disconnect = on_mount.map(run).filter(is_function);
                // @ts-ignore todo: improve typings
                for (const key in this.$$.slotted) {
                    // @ts-ignore todo: improve typings
                    this.appendChild(this.$$.slotted[key]);
                }
            }
            attributeChangedCallback(attr, _oldValue, newValue) {
                this[attr] = newValue;
            }
            disconnectedCallback() {
                run_all(this.$$.on_disconnect);
            }
            $destroy() {
                destroy_component(this, 1);
                this.$destroy = noop;
            }
            $on(type, callback) {
                // TODO should this delegate to addEventListener?
                const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
                callbacks.push(callback);
                return () => {
                    const index = callbacks.indexOf(callback);
                    if (index !== -1)
                        callbacks.splice(index, 1);
                };
            }
            $set($$props) {
                if (this.$$set && !is_empty($$props)) {
                    this.$$.skip_bound = true;
                    this.$$set($$props);
                    this.$$.skip_bound = false;
                }
            }
        };
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }

    /**
     * Logins to the server and returns the token.
     *
     * @param info
     * @param user
     * @returns {Promise<any>}
     */
    async function login(info) {
        return fetch(`https://${info.server}/v2/authentication`,
            {
                headers: new Headers({
                    'Content-Type': 'application/json'
                }),
                method: 'POST',
                body: JSON.stringify({'email': info['user']['email'], 'password': info['user']['pwd']})
            }).then((res) => {
            // Checks if request succeeded
            if (!res.ok) {
                return Promise.reject(
                    new Error(`${res.status.toString()}: ${res.statusText}`)
                )
            }

            return res.json();
        });
    }

    /**
     * Requests all the lists of a project and returns it.
     *
     * @returns {Promise<any>}
     */
    async function getList(info) {
        return fetch(`https://${info.server}/admin/lists?${new URLSearchParams({projectIri: 'http://rdfh.ch/projects/' + info.shortCode})}`)
            .then((res) => {
                // Checks if request succeeded
                if (!res.ok) {
                    return Promise.reject(
                        new Error(res.statusText)
                    )
                }

                return res.json();
            });
    }

    /**
     * Requests the ontology of a project and returns it.
     *
     * @returns {Promise<any>}
     */
    async function getOntology(info) {
        return fetch('https://' + info.server + '/v2/ontologies/allentities/' + encodeURIComponent('http://' + info.server + '/ontology/' + info.shortCode + '/' + info.ontologyIri + '/v2') + '?allLanguages=true', {
            method: 'GET'
        }).then((res) => {
            // Checks if request succeeded
            if (!res.ok) {
                return Promise.reject(
                    new Error(res.statusText)
                )
            }

            return res.json().then(data => data['@graph']);
        });
    }

    /**
     * Requests the data with the parameter given from parent component.
     *
     * @param offset
     * @param infos
     * @returns {Promise<unknown>}
     */
    async function gravSearchRequest(offset, infos) {
        return fetch(infos['url'], {
            method: infos['method'],
            body: infos['gravSearch'] + `\n OFFSET ${offset}`
        }).then((res) => {
            if (!res.ok) {
                return Promise.reject(
                    new Error(`${res.status.toString()}: ${res.statusText}`)
                )
            }

            return res.json();
        });
    }

    /**
     * Requests the data count with the parameter given from parent component and the offset 0.
     *
     * @returns {Promise<unknown>}
     */
    async function gravSearchRequestCount(infos) {
        return fetch(infos['url'] + '/count', {
            method: infos['method'],
            body: infos['gravSearch']
        }).then((res) => {
            // Checks if request succeeded
            if (!res.ok) {
                return Promise.reject(
                    new Error(`${res.status.toString()}: ${res.statusText}`)
                );
            }

            return res.json();
        });
    }

    /**
     * Requests the resource by the iri and returns it.
     *
     * @param iri
     * @param token
     * @param infos
     * @returns {Promise<any>}
     */
    async function getResByIri(iri, token, infos) {
        // Checks if token is valid
        if (!token) {
            return Promise.reject(
                new Error("No valid token")
            );
        }

        return fetch(`https://${infos.server}/v2/resources/${encodeURIComponent(iri)}`, {
            headers: new Headers({
                'Authorization': `Bearer ${token}`
            })
        }).then((res) => {
            // Checks if request succeeded
            if (!res.ok) {
                return Promise.reject(
                    new Error(`${res.status.toString()}: ${res.statusText}`)
                )
            }

            return res.json();
        })
    }

    /**
     * Requests the list node by the iri and returns it.
     *
     * @param iri
     * @param token
     * @param infos
     * @returns {Promise<any>}
     */
    async function getListNode(iri, token, infos) {
        // Checks if token is valid
        if (!token) {
            return Promise.reject(
                new Error("No valid token")
            )
        }

        return fetch(`https://${infos.server}/v2/node/${encodeURIComponent(iri)}`, {
            headers: new Headers({
                'Authorization': `Bearer ${token}`
            })
        }).then((res) => {
            // Checks if request succeeded
            if (!res.ok) {
                return Promise.reject(
                    new Error(res.statusText)
                )
            }

            return res.json();
        });
    }

    class Image {
        constructor(id, url, x, y) {
            this.id = id;
            this.url = url;
            this.x = x;
            this.y = y;
        }
    }

    /* src/ResultList.svelte generated by Svelte v3.42.4 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src/ResultList.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i][0];
    	child_ctx[37] = list[i][1];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[40] = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	child_ctx[32] = i;
    	return child_ctx;
    }

    // (680:4) {:catch error}
    function create_catch_block_1(ctx) {
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Something went wrong";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Resource data couldn't be loaded. Let's give it another shot!";
    			t3 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Try again";
    			attr_dev(div0, "class", "error-header");
    			add_location(div0, file, 681, 12, 25221);
    			attr_dev(div1, "class", "error-text");
    			add_location(div1, file, 682, 12, 25286);
    			add_location(button, file, 684, 16, 25440);
    			attr_dev(div2, "class", "error-btn-container");
    			add_location(div2, file, 683, 12, 25390);
    			attr_dev(div3, "class", "error");
    			add_location(div3, file, 680, 8, 25189);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block_1.name,
    		type: "catch",
    		source: "(680:4) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (616:4) {:then data}
    function create_then_block(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = /*search_data_fetched*/ ctx[3] && create_if_block_1(ctx);
    	let if_block1 = /*invalid_images*/ ctx[4] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*search_data_fetched*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*invalid_images*/ ctx[4]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(616:4) {:then data}",
    		ctx
    	});

    	return block;
    }

    // (618:8) {#if search_data_fetched}
    function create_if_block_1(ctx) {
    	let show_if;
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (show_if == null || dirty[0] & /*promise_data*/ 2) show_if = !!isEmpty(/*data*/ ctx[29]);
    		if (show_if) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx, [-1, -1]);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(618:8) {#if search_data_fetched}",
    		ctx
    	});

    	return block;
    }

    // (621:12) {:else}
    function create_else_block(ctx) {
    	let button0;
    	let t0;
    	let t1;
    	let button1;
    	let t2;
    	let button1_disabled_value;
    	let t3;
    	let promise;
    	let t4;
    	let if_block_anchor;
    	let mounted;
    	let dispose;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block_1,
    		then: create_then_block_1,
    		catch: create_catch_block,
    		value: 43
    	};

    	handle_promise(promise = /*promise_amount*/ ctx[2], info);

    	function select_block_type_1(ctx, dirty) {
    		if (/*display*/ ctx[0] === "images") return create_if_block_3;
    		if (/*display*/ ctx[0] === "properties") return create_if_block_5;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			t0 = text("<");
    			t1 = space();
    			button1 = element("button");
    			t2 = text(">");
    			t3 = space();
    			info.block.c();
    			t4 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			button0.disabled = /*preventPrevious*/ ctx[10]();
    			add_location(button0, file, 623, 16, 22555);
    			button1.disabled = button1_disabled_value = preventNext(/*data*/ ctx[29]);
    			add_location(button1, file, 624, 16, 22650);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t2);
    			insert_dev(target, t3, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => t4.parentNode;
    			info.anchor = t4;
    			insert_dev(target, t4, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[13], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[14], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*promise_data*/ 2 && button1_disabled_value !== (button1_disabled_value = preventNext(/*data*/ ctx[29]))) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			info.ctx = ctx;

    			if (dirty[0] & /*promise_amount*/ 4 && promise !== (promise = /*promise_amount*/ ctx[2]) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    			if (detaching) detach_dev(t4);

    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(621:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (619:12) {#if isEmpty(data)}
    function create_if_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("No data found!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(619:12) {#if isEmpty(data)}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <svelte:options tag="result-list"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }
    function create_catch_block(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <svelte:options tag=\\\"result-list\\\"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }",
    		ctx
    	});

    	return block;
    }

    // (628:48)                      {getAmountRange(data)}
    function create_then_block_1(ctx) {
    	let t0_value = /*getAmountRange*/ ctx[11](/*data*/ ctx[29]) + "";
    	let t0;
    	let t1;
    	let t2_value = /*bla*/ ctx[43]['schema:numberOfItems'] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text(" of ");
    			t2 = text(t2_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*promise_data*/ 2 && t0_value !== (t0_value = /*getAmountRange*/ ctx[11](/*data*/ ctx[29]) + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*promise_amount*/ 4 && t2_value !== (t2_value = /*bla*/ ctx[43]['schema:numberOfItems'] + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block_1.name,
    		type: "then",
    		source: "(628:48)                      {getAmountRange(data)}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <svelte:options tag="result-list"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }
    function create_pending_block_1(ctx) {
    	const block = { c: noop, m: noop, p: noop, d: noop };

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block_1.name,
    		type: "pending",
    		source: "(1:0) <svelte:options tag=\\\"result-list\\\"/>  <script>     import {         login,         getList,         getOntology,         gravSearchRequest,         gravSearchRequestCount,         getResByIri,         getListNode     }",
    		ctx
    	});

    	return block;
    }

    // (649:51) 
    function create_if_block_5(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*resources*/ ctx[5];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 32) {
    				each_value_1 = /*resources*/ ctx[5];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(649:51) ",
    		ctx
    	});

    	return block;
    }

    // (633:16) {#if display === "images"}
    function create_if_block_3(ctx) {
    	let section;

    	function select_block_type_2(ctx, dirty) {
    		if (/*images*/ ctx[6].length > 0) return create_if_block_4;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if_block.c();
    			attr_dev(section, "class", "img-section");
    			add_location(section, file, 634, 20, 23078);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if_block.m(section, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(section, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(633:16) {#if display === \\\"images\\\"}",
    		ctx
    	});

    	return block;
    }

    // (653:28) {#if resource.hasOwnProperty('knora-api:hasStillImageFileValue')}
    function create_if_block_7(ctx) {
    	let div0;
    	let t;
    	let div1;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			img = element("img");
    			add_location(div0, file, 653, 32, 24158);
    			if (!src_url_equal(img.src, img_src_value = getIIIfFullURL(/*resource*/ ctx[33]['knora-api:hasStillImageFileValue']['values']['url'], square_size))) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 654, 37, 24207);
    			add_location(div1, file, 654, 32, 24202);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 32 && !src_url_equal(img.src, img_src_value = getIIIfFullURL(/*resource*/ ctx[33]['knora-api:hasStillImageFileValue']['values']['url'], square_size))) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(653:28) {#if resource.hasOwnProperty('knora-api:hasStillImageFileValue')}",
    		ctx
    	});

    	return block;
    }

    // (659:32) {#if key !== 'knora-api:hasStillImageFileValue'}
    function create_if_block_6(ctx) {
    	let div0;

    	let t0_value = (/*value*/ ctx[37].labels
    	? /*value*/ ctx[37].labels['en']
    	: 'Property') + "";

    	let t0;
    	let t1;
    	let div1;
    	let each_value_3 = /*value*/ ctx[37].values;
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "prop-header");
    			add_location(div0, file, 659, 36, 24547);
    			add_location(div1, file, 660, 36, 24662);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 32 && t0_value !== (t0_value = (/*value*/ ctx[37].labels
    			? /*value*/ ctx[37].labels['en']
    			: 'Property') + "")) set_data_dev(t0, t0_value);

    			if (dirty[0] & /*resources*/ 32) {
    				each_value_3 = /*value*/ ctx[37].values;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(659:32) {#if key !== 'knora-api:hasStillImageFileValue'}",
    		ctx
    	});

    	return block;
    }

    // (662:40) {#each value.values as val}
    function create_each_block_3(ctx) {
    	let div;
    	let raw_value = /*val*/ ctx[40] + "";

    	const block = {
    		c: function create() {
    			div = element("div");
    			add_location(div, file, 662, 44, 24780);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = raw_value;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 32 && raw_value !== (raw_value = /*val*/ ctx[40] + "")) div.innerHTML = raw_value;		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(662:40) {#each value.values as val}",
    		ctx
    	});

    	return block;
    }

    // (658:28) {#each Object.entries(resource) as [key, value]}
    function create_each_block_2(ctx) {
    	let if_block_anchor;
    	let if_block = /*key*/ ctx[36] !== 'knora-api:hasStillImageFileValue' && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*key*/ ctx[36] !== 'knora-api:hasStillImageFileValue') {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(658:28) {#each Object.entries(resource) as [key, value]}",
    		ctx
    	});

    	return block;
    }

    // (651:20) {#each resources as resource}
    function create_each_block_1(ctx) {
    	let section;
    	let show_if = /*resource*/ ctx[33].hasOwnProperty('knora-api:hasStillImageFileValue');
    	let t0;
    	let t1;
    	let if_block = show_if && create_if_block_7(ctx);
    	let each_value_2 = Object.entries(/*resource*/ ctx[33]);
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			t0 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			attr_dev(section, "class", "res-section");
    			add_location(section, file, 651, 24, 24002);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    			append_dev(section, t0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section, null);
    			}

    			append_dev(section, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*resources*/ 32) show_if = /*resource*/ ctx[33].hasOwnProperty('knora-api:hasStillImageFileValue');

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_7(ctx);
    					if_block.c();
    					if_block.m(section, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*resources*/ 32) {
    				each_value_2 = Object.entries(/*resource*/ ctx[33]);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(section, t1);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(651:20) {#each resources as resource}",
    		ctx
    	});

    	return block;
    }

    // (645:24) {:else }
    function create_else_block_1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "No Results";
    			add_location(div, file, 645, 28, 23748);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(645:24) {:else }",
    		ctx
    	});

    	return block;
    }

    // (636:24) {#if images.length > 0}
    function create_if_block_4(ctx) {
    	let div;
    	let each_value = /*images*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "images-container");
    			set_style(div, "--size", square_size + "px");
    			add_location(div, file, 636, 28, 23184);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*images*/ 64) {
    				each_value = /*images*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(636:24) {#if images.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (638:32) {#each images as img, i}
    function create_each_block(ctx) {
    	let img;
    	let img_src_value;
    	let mounted;
    	let dispose;

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[15](/*img*/ ctx[30]);
    	}

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "small-image");
    			if (!src_url_equal(img.src, img_src_value = getIIIfSquareURL(/*img*/ ctx[30]['url'], square_size))) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "result image number " + (/*i*/ ctx[32] + 1));
    			add_location(img, file, 638, 36, 23340);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);

    			if (!mounted) {
    				dispose = listen_dev(img, "click", click_handler_2, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*images*/ 64 && !src_url_equal(img.src, img_src_value = getIIIfSquareURL(/*img*/ ctx[30]['url'], square_size))) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(638:32) {#each images as img, i}",
    		ctx
    	});

    	return block;
    }

    // (676:8) {#if invalid_images}
    function create_if_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("No invalid images");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(676:8) {#if invalid_images}",
    		ctx
    	});

    	return block;
    }

    // (614:25)          <div>...loading data</div>     {:then data}
    function create_pending_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "...loading data";
    			add_location(div, file, 614, 8, 22332);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(614:25)          <div>...loading data</div>     {:then data}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let promise;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block_1,
    		value: 29,
    		error: 44
    	};

    	handle_promise(promise = /*promise_data*/ ctx[1], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			info.block.c();
    			this.c = noop;
    			attr_dev(div, "class", "container");
    			add_location(div, file, 612, 0, 22274);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty[0] & /*promise_data*/ 2 && promise !== (promise = /*promise_data*/ ctx[1]) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const result_per_request = 25;

    /**
     * Size of image in pixels that will be shown if display is set to 'images'.
     * @type {number}
     */
    const square_size = 150;

    /**
     * Size of image in pixels that will be shown if display is set to 'properties'.
     * @type {number}
     */
    const image_size = 700;

    /**
     * Create the label object with languages as keys.
     *
     * @param labels
     * @returns {{}|*}
     */
    function changeLabels(labels) {
    	if (Array.isArray(labels)) {
    		let newLabel = {};

    		labels.forEach(label => {
    			if (label.hasOwnProperty('@language')) {
    				newLabel[label['@language']] = label['@value'];
    			} else if (label.hasOwnProperty('language')) {
    				newLabel[label['language']] = label['value'];
    			}
    		});

    		return newLabel;
    	} else {
    		let newLabel = {};

    		if (labels.hasOwnProperty('@language')) {
    			newLabel[labels['@language']] = labels['@value'];
    		} else if (labels.hasOwnProperty('language')) {
    			newLabel[labels['language']] = labels['value'];
    		}

    		return newLabel;
    	}
    }

    /**
     * Checks if the data has hasStillImageFileValue property, so the images passed to the child component and
     * can be displayed in the end.
     *
     * @param data
     * @returns {boolean}
     */
    function hasValidImages(data) {
    	if (data.hasOwnProperty('@graph') && Array.isArray(data['@graph'])) {
    		return data['@graph'].every(obj => obj['knora-api:hasStillImageFileValue']);
    	} else {
    		return data.hasOwnProperty('knora-api:hasStillImageFileValue');
    	}
    }

    /**
     * Builds the iiif url with square image and a custom size.
     *
     * @param url
     * @param size
     * @returns {string}
     */
    function getIIIfSquareURL(url, size) {
    	return `${url}/square/${size},/0/default.jpg`;
    }

    /**
     * Builds the iiif url with full image and a custom size.
     *
     * @param url
     * @param size
     * @returns {string}
     */
    function getIIIfFullURL(url, size) {
    	return `${url}/full/${size},/0/default.jpg`;
    }

    /**
     * ???
     *
     * @param img
     */
    function openImageOverlay(img) {
    	console.log('Clicked on image', getIIIfFullURL(img['url'], image_size));
    } // TODO Find a solution to show the image in full size.

    /**
     * Checks if data is an empty object.
     *
     * @param data
     * @returns {boolean}
     */
    function isEmpty(data) {
    	return Object.keys(data).length === 0;
    }

    /**
     * Prevents showing next results if data does not have flag for more result.
     *
     * @param data
     * @returns {boolean}
     */
    function preventNext(data) {
    	return !(data.hasOwnProperty('knora-api:mayHaveMoreResults') && data['knora-api:mayHaveMoreResults']);
    }

    /**
     * Wraps the data in an array if there is one or no result.
     *
     * @param data
     */
    function wrapData(data) {
    	if (data['@graph']) {
    		return data['@graph'];
    	} else if (data['@id']) {
    		return [data];
    	} else {
    		return [];
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('result-list', slots, []);
    	let { request_infos } = $$props;

    	/**
     * Stores the info what should be displayed. Value can be 'properties' or 'images'.
     */
    	let display = "";

    	/**
     * Promises objects
     */
    	let promise_data, promise_amount, promise_all_results;

    	/**
     * Offset for the gravsearch query. Defaul is set to 0
     * @type {number}
     */
    	let current_offset = 0;

    	/**
     * Token, lists and ontology of a project.
     */
    	let token, lists, ontology;

    	/**
     * Flag if the data was fetched by completing a data request.
     * @type {boolean}
     */
    	let search_data_fetched = false;

    	/**
     * Flag to be set if display is set to 'images' and there is no images property in the resource.
     * @type {boolean}
     */
    	let invalid_images = false;

    	/**
     * Array containing the resources that will be displayed in the template.
     * @type {*[]}
     */
    	let resources = [];

    	/**
     * Array containing the images that will be displayed in the template.
     * @type {*[]}
     */
    	let images = [];

    	/**
     * Initializes function that will be triggered if the input parameter "request_infos" is changed.
     * Does all the necessary requests like getting the token, list, ontology of the project and doing the gravsearch
     * request.
     */
    	function initialize() {
    		if (inputIsValid()) {
    			current_offset = 0;
    			$$invalidate(0, display = getDisplayInfo());

    			// Set up all requests
    			const p1 = login(request_infos);

    			const p2 = getList(request_infos).then(l => l.lists);
    			const p3 = getOntology(request_infos);
    			const p4 = gravSearchRequest(current_offset, request_infos);

    			$$invalidate(1, promise_data = Promise.all([p1, p2, p3, p4]).then(([d1, d2, d3, d4]) => {
    				token = d1;
    				lists = d2;
    				ontology = d3;

    				if (display === 'images') {
    					if (hasValidImages(d4)) {
    						$$invalidate(6, images = addImages(wrapData(d4)));
    						$$invalidate(2, promise_amount = gravSearchRequestCount(request_infos));
    						$$invalidate(3, search_data_fetched = true);
    					} else {
    						$$invalidate(4, invalid_images = true);
    					}
    				} else {
    					getData(d4);
    					$$invalidate(2, promise_amount = gravSearchRequestCount(request_infos));
    					$$invalidate(3, search_data_fetched = true);
    				}

    				return d4;
    			}));
    		} else {
    			console.log("not valid input");
    		}
    	}

    	/**
     * Starts the gravsearch request and assigns to a promise.
     *
     * @param offset
     */
    	function startSearchRequest(offset) {
    		$$invalidate(1, promise_data = gravSearchRequest(offset, request_infos).then(data => {
    			if (display === 'images') {
    				if (hasValidImages(data)) {
    					$$invalidate(6, images = addImages(wrapData(data)));
    					$$invalidate(3, search_data_fetched = true);
    				} else {
    					$$invalidate(4, invalid_images = true);
    				}
    			} else {
    				getData(data);
    				$$invalidate(3, search_data_fetched = true);
    			}

    			return data;
    		}));
    	}

    	/**
     * Requests the data by looping through all the resources and initializes the requests for its properties.
     *
     * @param data
     * @returns {Promise<void>}
     */
    	async function getData(data) {
    		$$invalidate(5, resources = []);

    		for (let a of wrapData(data)) {
    			const resData = await getResByIri(a['@id'], token, request_infos);

    			const resource = {
    				'knora-api:arkUrl': {
    					labels: { 'en': 'ARK Url', 'de': 'ARK Url' },
    					values: new Array(`<a href=${resData['knora-api:arkUrl']['@value']} target='_blank'>${resData['knora-api:arkUrl']['@value']}</a>`)
    				},
    				'@id': {
    					labels: { 'en': 'Resource ID', 'de': 'Resource ID' },
    					values: new Array(a['@id'])
    				}
    			};

    			for (const [key, value] of Object.entries(resData)) {
    				if (key.includes(`${request_infos['ontologyIri']}:`)) {
    					const correctedKey = key.replace('Value', '');

    					if (Array.isArray(value)) {
    						for (let val of value) {
    							await saveProp(correctedKey, val, resource);
    						}
    					} else {
    						await saveProp(correctedKey, value, resource);
    					}
    				}
    			}

    			// Adding the still image information
    			if (resData.hasOwnProperty('knora-api:hasStillImageFileValue')) {
    				resource['knora-api:hasStillImageFileValue'] = {
    					labels: { 'en': 'Still image', 'de': 'Bild' },
    					values: convertImageObj(resData)
    				};
    			}

    			$$invalidate(5, resources = [...resources, resource]);
    		}
    	}

    	/**
     * Evaluates which type the property is and saves the value to the resource object.
     *
     * @param propName
     * @param propValue
     * @param resource
     * @returns {Promise<void>}
     */
    	async function saveProp(propName, propValue, resource) {
    		switch (propValue['@type']) {
    			case 'knora-api:DecimalValue':
    				// ['knora-api:decimalValueAsDecimal']['@value'] = '1.5'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:decimalValueAsDecimal']['@value']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:decimalValueAsDecimal']['@value']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:BooleanValue':
    				// ['knora-api:booleanValueAsBoolean'] = true
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:booleanValueAsBoolean']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:booleanValueAsBoolean']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:ColorValue':
    				// ['knora-api:colorValueAsColor'] = '#ff3333'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:colorValueAsColor']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:colorValueAsColor']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:TimeValue':
    				// ['knora-api:timeValueAsTimeStamp']['@value'] = '2019-08-30T10:45:20.173572Z'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:timeValueAsTimeStamp']['@value']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:timeValueAsTimeStamp']['@value']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:UriValue':
    				// ['knora-api:uriValueAsUri']['@value'] = 'http://www.google.ch'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:uriValueAsUri']['@value']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:uriValueAsUri']['@value']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:GeomValue':
    				// TODO -> ['knora-api:geometryValueAsGeometry'] = "{\"status\":\"active\",\"lineColor\":\"#ff3333\",\"lineWidth\":2,\"points\":[{\"x\":0.08098591549295775,\"y\":0.16741071428571427},{\"x\":0.7394366197183099,\"y\":0.7299107142857143}],\"type\":\"rectangle\",\"original_index\":0}"
    				break;
    			case 'knora-api:GeonameValue':
    				// ['knora-api:geonameValueAsGeonameCode'] = '2661604'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:geonameValueAsGeonameCode']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:geonameValueAsGeonameCode']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:IntervalValue':
    				// ['knora-api:intervalValueHasStart']['@value'] = '0'
    				// ['knora-api:intervalValueHasEnd']['@value'] = '216000'
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(`${propValue['knora-api:intervalValueHasStart']['@value']}-${propValue['knora-api:intervalValueHasEnd']['@value']}`);
    						} else {
    							resource[propName] = {
    								values: [
    									`${propValue['knora-api:intervalValueHasStart']['@value']}-${propValue['knora-api:intervalValueHasEnd']['@value']}`
    								],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:TextValue':
    				// Simple Text
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:valueAsString']);
    						} else {
    							resource[propName] = {
    								values: new Array(propValue['knora-api:valueAsString']),
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				// Rich Text
    				// TODO -> ['knora-api:textValueAsXml'] = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<text><p>test with <strong>markup</strong></p></text>"
    				break;
    			case 'knora-api:IntValue':
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:intValueAsInt']);
    						} else {
    							resource[propName] = {
    								values: [propValue['knora-api:intValueAsInt']],
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:DateValue':
    				// In case the details will be needed
    				// ['knora-api:dateValueHasCalendar'] = 'GREGORIAN'
    				// ['knora-api:dateValueHasEndDay'] = 13;
    				// ['knora-api:dateValueHasEndEra'] =  'CE';
    				// ['knora-api:dateValueHasEndMonth'] = 5;
    				// ['knora-api:dateValueHasEndYear'] = 2018;
    				// ['knora-api:dateValueHasStartDay'] = 13;
    				// ['knora-api:dateValueHasStartEra'] = 'CE';
    				// ['knora-api:dateValueHasStartMonth'] = 5;
    				// ['knora-api:dateValueHasStartYear'] = 2018;
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:valueAsString']);
    						} else {
    							resource[propName] = {
    								values: new Array(propValue['knora-api:valueAsString']),
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:ListValue':
    				const listObject = await getListNode(propValue['knora-api:listValueAsListNode']['@id'], token, request_infos);
    				lists.forEach(list => {
    					if (list.id === listObject['knora-api:hasRootNode']['@id']) {
    						if (resource[listObject['knora-api:hasRootNode']['@id']]) {
    							resource[listObject['knora-api:hasRootNode']['@id']]['values'].push(listObject['rdfs:label']);
    						} else {
    							resource[listObject['knora-api:hasRootNode']['@id']] = {
    								values: new Array(listObject['rdfs:label']),
    								labels: changeLabels(list['labels'])
    							};
    						}
    					}
    				});
    				break;
    			case 'knora-api:LinkValue':
    				ontology.forEach(onto => {
    					if (onto['@id'] === propName) {
    						if (resource[propName]) {
    							resource[propName]['values'].push(propValue['knora-api:linkValueHasTarget']['@id']);
    						} else {
    							resource[propName] = {
    								values: new Array(propValue['knora-api:linkValueHasTarget']['@id']),
    								labels: changeLabels(onto['rdfs:label'])
    							};
    						}
    					}
    				});
    				break;
    		}
    	}

    	/**
     * Checks if request_infos object has the necessary properties for executing the request.
     *
     * @returns {boolean}
     */
    	function inputIsValid() {
    		return request_infos.hasOwnProperty("ontologyIri") && request_infos.hasOwnProperty("server") && request_infos.hasOwnProperty("shortCode") && request_infos.hasOwnProperty("method") && request_infos.hasOwnProperty("url");
    	}

    	/**
     * Getting the display info from input object.
     *
     * @returns {*|string}
     */
    	function getDisplayInfo() {
    		return request_infos['display'] && (request_infos['display'] === 'properties' || request_infos['display'] === 'images')
    		? request_infos['display']
    		: "properties";
    	}

    	/**
     * Converts every element from the results into a image object and is added to an array.
     *
     * @param images
     * @returns {Image[]}
     */
    	function addImages(images) {
    		return [...images.map(image => convertImageObj(image))];
    	}

    	/**
     * Converts a object from result into an image object.
     *
     * @param image
     * @returns {Image}
     */
    	function convertImageObj(image) {
    		const url = `${image['knora-api:hasStillImageFileValue']['knora-api:stillImageFileValueHasIIIFBaseUrl']['@value']}/${image['knora-api:hasStillImageFileValue']['knora-api:fileValueHasFilename']}`;
    		return new Image(image['@id'], url, image['knora-api:hasStillImageFileValue']['knora-api:stillImageFileValueHasDimX'], image['knora-api:hasStillImageFileValue']['knora-api:stillImageFileValueHasDimY']);
    	}

    	/**
     * Increases the offset and starts a new request with the new offset.
     */
    	function next() {
    		startSearchRequest(current_offset += 1);
    	}

    	/**
     * Decreases the offset and starts a new request with the new offset.
     */
    	function previous() {
    		startSearchRequest(current_offset -= 1);
    	}

    	/**
     * Prevents showing previous results if current offset is 0.
     *
     * @returns {boolean}
     */
    	function preventPrevious() {
    		return current_offset === 0;
    	}

    	/**
     * Get range of the displayed results.
     *
     * @param data
     */
    	function getAmountRange(data) {
    		if (data.hasOwnProperty('@graph')) {
    			return `${current_offset * result_per_request + 1}-${current_offset * result_per_request + data['@graph'].length}`;
    		} else {
    			return `${current_offset * result_per_request + 1}`;
    		}
    	}

    	const writable_props = ['request_infos'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<result-list> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => previous();
    	const click_handler_1 = () => next();
    	const click_handler_2 = img => openImageOverlay(img);
    	const click_handler_3 = () => initialize();

    	$$self.$$set = $$props => {
    		if ('request_infos' in $$props) $$invalidate(12, request_infos = $$props.request_infos);
    	};

    	$$self.$capture_state = () => ({
    		login,
    		getList,
    		getOntology,
    		gravSearchRequest,
    		gravSearchRequestCount,
    		getResByIri,
    		getListNode,
    		Image,
    		request_infos,
    		display,
    		promise_data,
    		promise_amount,
    		promise_all_results,
    		current_offset,
    		result_per_request,
    		square_size,
    		image_size,
    		token,
    		lists,
    		ontology,
    		search_data_fetched,
    		invalid_images,
    		resources,
    		images,
    		initialize,
    		startSearchRequest,
    		getData,
    		saveProp,
    		changeLabels,
    		inputIsValid,
    		getDisplayInfo,
    		hasValidImages,
    		addImages,
    		convertImageObj,
    		getIIIfSquareURL,
    		getIIIfFullURL,
    		openImageOverlay,
    		isEmpty,
    		next,
    		previous,
    		preventPrevious,
    		preventNext,
    		getAmountRange,
    		wrapData
    	});

    	$$self.$inject_state = $$props => {
    		if ('request_infos' in $$props) $$invalidate(12, request_infos = $$props.request_infos);
    		if ('display' in $$props) $$invalidate(0, display = $$props.display);
    		if ('promise_data' in $$props) $$invalidate(1, promise_data = $$props.promise_data);
    		if ('promise_amount' in $$props) $$invalidate(2, promise_amount = $$props.promise_amount);
    		if ('promise_all_results' in $$props) promise_all_results = $$props.promise_all_results;
    		if ('current_offset' in $$props) current_offset = $$props.current_offset;
    		if ('token' in $$props) token = $$props.token;
    		if ('lists' in $$props) lists = $$props.lists;
    		if ('ontology' in $$props) ontology = $$props.ontology;
    		if ('search_data_fetched' in $$props) $$invalidate(3, search_data_fetched = $$props.search_data_fetched);
    		if ('invalid_images' in $$props) $$invalidate(4, invalid_images = $$props.invalid_images);
    		if ('resources' in $$props) $$invalidate(5, resources = $$props.resources);
    		if ('images' in $$props) $$invalidate(6, images = $$props.images);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*request_infos*/ 4096) {
    			/**
     * Observing the input variables and starting the initialization.
     */
    			request_infos && initialize();
    		}
    	};

    	return [
    		display,
    		promise_data,
    		promise_amount,
    		search_data_fetched,
    		invalid_images,
    		resources,
    		images,
    		initialize,
    		next,
    		previous,
    		preventPrevious,
    		getAmountRange,
    		request_infos,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class ResultList extends SvelteElement {
    	constructor(options) {
    		super();
    		this.shadowRoot.innerHTML = `<style>.container{margin-top:1rem;border:1px solid lightgray;padding:1rem}.res-section{margin:1rem 0;padding:1.5rem;display:grid;grid-template-columns:auto 1fr;gap:1rem;border:1px solid darkgray;font-size:smaller}@media(max-width: 600px){.res-section{grid-template-columns:1fr;gap:0.5rem}}.prop-header{font-weight:bold}.error{text-align:center}.error-header{font-size:larger;margin-top:0.5rem}.error-text{margin:0.5rem}.error-btn-container>button{margin:0.5rem;background-color:dodgerblue;color:white}.img-section{margin:1rem 0}.images-container{margin-top:1rem;margin-bottom:1rem;display:grid;justify-content:center;grid-template-columns:repeat(auto-fill, minmax(var(--size), var(--size)));gap:1rem}.small-image{opacity:1;-webkit-transition:.3s ease-in-out;transition:.3s ease-in-out}.small-image:hover{opacity:.5;cursor:pointer}</style>`;

    		init(
    			this,
    			{
    				target: this.shadowRoot,
    				props: attribute_to_object(this.attributes),
    				customElement: true
    			},
    			instance,
    			create_fragment,
    			safe_not_equal,
    			{ request_infos: 12 },
    			null,
    			[-1, -1]
    		);

    		const { ctx } = this.$$;
    		const props = this.attributes;

    		if (/*request_infos*/ ctx[12] === undefined && !('request_infos' in props)) {
    			console_1.warn("<result-list> was created without expected prop 'request_infos'");
    		}

    		if (options) {
    			if (options.target) {
    				insert_dev(options.target, this, options.anchor);
    			}

    			if (options.props) {
    				this.$set(options.props);
    				flush();
    			}
    		}
    	}

    	static get observedAttributes() {
    		return ["request_infos"];
    	}

    	get request_infos() {
    		return this.$$.ctx[12];
    	}

    	set request_infos(request_infos) {
    		this.$$set({ request_infos });
    		flush();
    	}
    }

    customElements.define("result-list", ResultList);

}());
//# sourceMappingURL=bundle.js.map
