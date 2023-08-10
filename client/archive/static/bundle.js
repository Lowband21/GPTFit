
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    // Adapted from https://github.com/then/is-promise/blob/master/index.js
    // Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
    function is_promise(value) {
        return !!value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
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
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    /**
     * List of attributes that should always be set through the attr method,
     * because updating them through the property setter doesn't work reliably.
     * In the example of `width`/`height`, the problem is that the setter only
     * accepts numeric values, but the attribute can also be set to a string like `50%`.
     * If this list becomes too big, rethink this approach.
     */
    const always_set_through_set_attribute = ['width', 'height'];
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set && always_set_through_set_attribute.indexOf(key) === -1) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_options(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            option.selected = ~value.indexOf(option.__value);
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function select_multiple_value(select) {
        return [].map.call(select.querySelectorAll(':checked'), option => option.__value);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    function construct_svelte_component(component, props) {
        return new component(props);
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
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    /**
     * Associates an arbitrary `context` object with the current component and the specified `key`
     * and returns that object. The context is then available to children of the component
     * (including slotted content) with `getContext`.
     *
     * Like lifecycle functions, this must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-setcontext
     */
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
        return context;
    }
    /**
     * Retrieves the context that belongs to the closest parent component with the specified `key`.
     * Must be called during component initialisation.
     *
     * https://svelte.dev/docs#run-time-svelte-getcontext
     */
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
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
        else if (callback) {
            callback();
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

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
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
            flush_render_callbacks($$.after_update);
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
            ctx: [],
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
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
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
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
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
    }

    const LOCATION = {};
    const ROUTER = {};
    const HISTORY = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     * https://github.com/reach/router/blob/master/LICENSE
     */

    const PARAM = /^:(.+)/;
    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Split up the URI into segments delimited by `/`
     * Strip starting/ending `/`
     * @param {string} uri
     * @return {string[]}
     */
    const segmentize = (uri) => uri.replace(/(^\/+|\/+$)/g, "").split("/");
    /**
     * Strip `str` of potential start and end `/`
     * @param {string} string
     * @return {string}
     */
    const stripSlashes = (string) => string.replace(/(^\/+|\/+$)/g, "");
    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    const rankRoute = (route, index) => {
        const score = route.default
            ? 0
            : segmentize(route.path).reduce((score, segment) => {
                  score += SEGMENT_POINTS;

                  if (segment === "") {
                      score += ROOT_POINTS;
                  } else if (PARAM.test(segment)) {
                      score += DYNAMIC_POINTS;
                  } else if (segment[0] === "*") {
                      score -= SEGMENT_POINTS + SPLAT_PENALTY;
                  } else {
                      score += STATIC_POINTS;
                  }

                  return score;
              }, 0);

        return { route, score, index };
    };
    /**
     * Give a score to all routes and sort them on that
     * If two routes have the exact same score, we go by index instead
     * @param {object[]} routes
     * @return {object[]}
     */
    const rankRoutes = (routes) =>
        routes
            .map(rankRoute)
            .sort((a, b) =>
                a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
            );
    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    const pick = (routes, uri) => {
        let match;
        let default_;

        const [uriPathname] = uri.split("?");
        const uriSegments = segmentize(uriPathname);
        const isRootUri = uriSegments[0] === "";
        const ranked = rankRoutes(routes);

        for (let i = 0, l = ranked.length; i < l; i++) {
            const route = ranked[i].route;
            let missed = false;

            if (route.default) {
                default_ = {
                    route,
                    params: {},
                    uri,
                };
                continue;
            }

            const routeSegments = segmentize(route.path);
            const params = {};
            const max = Math.max(uriSegments.length, routeSegments.length);
            let index = 0;

            for (; index < max; index++) {
                const routeSegment = routeSegments[index];
                const uriSegment = uriSegments[index];

                if (routeSegment && routeSegment[0] === "*") {
                    // Hit a splat, just grab the rest, and return a match
                    // uri:   /files/documents/work
                    // route: /files/* or /files/*splatname
                    const splatName =
                        routeSegment === "*" ? "*" : routeSegment.slice(1);

                    params[splatName] = uriSegments
                        .slice(index)
                        .map(decodeURIComponent)
                        .join("/");
                    break;
                }

                if (typeof uriSegment === "undefined") {
                    // URI is shorter than the route, no match
                    // uri:   /users
                    // route: /users/:userId
                    missed = true;
                    break;
                }

                const dynamicMatch = PARAM.exec(routeSegment);

                if (dynamicMatch && !isRootUri) {
                    const value = decodeURIComponent(uriSegment);
                    params[dynamicMatch[1]] = value;
                } else if (routeSegment !== uriSegment) {
                    // Current segments don't match, not dynamic, not splat, so no match
                    // uri:   /users/123/settings
                    // route: /users/:id/profile
                    missed = true;
                    break;
                }
            }

            if (!missed) {
                match = {
                    route,
                    params,
                    uri: "/" + uriSegments.slice(0, index).join("/"),
                };
                break;
            }
        }

        return match || default_ || null;
    };
    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    const addQuery = (pathname, query) => pathname + (query ? `?${query}` : "");
    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    const resolve = (to, base) => {
        // /foo/bar, /baz/qux => /foo/bar
        if (to.startsWith("/")) return to;

        const [toPathname, toQuery] = to.split("?");
        const [basePathname] = base.split("?");
        const toSegments = segmentize(toPathname);
        const baseSegments = segmentize(basePathname);

        // ?a=b, /users?b=c => /users?a=b
        if (toSegments[0] === "") return addQuery(basePathname, toQuery);

        // profile, /users/789 => /users/789/profile

        if (!toSegments[0].startsWith(".")) {
            const pathname = baseSegments.concat(toSegments).join("/");
            return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
        }

        // ./       , /users/123 => /users/123
        // ../      , /users/123 => /users
        // ../..    , /users/123 => /
        // ../../one, /a/b/c/d   => /a/b/one
        // .././one , /a/b/c/d   => /a/b/c/one
        const allSegments = baseSegments.concat(toSegments);
        const segments = [];

        allSegments.forEach((segment) => {
            if (segment === "..") segments.pop();
            else if (segment !== ".") segments.push(segment);
        });

        return addQuery("/" + segments.join("/"), toQuery);
    };
    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    const combinePaths = (basepath, path) =>
        `${stripSlashes(
        path === "/"
            ? basepath
            : `${stripSlashes(basepath)}/${stripSlashes(path)}`
    )}/`;
    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    const shouldNavigate = (event) =>
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

    const canUseDOM = () =>
        typeof window !== "undefined" &&
        "document" in window &&
        "location" in window;

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.59.2 */
    const get_default_slot_changes$2 = dirty => ({ active: dirty & /*ariaCurrent*/ 4 });
    const get_default_slot_context$2 = ctx => ({ active: !!/*ariaCurrent*/ ctx[2] });

    function create_fragment$9(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], get_default_slot_context$2);

    	let a_levels = [
    		{ href: /*href*/ ctx[0] },
    		{ "aria-current": /*ariaCurrent*/ ctx[2] },
    		/*props*/ ctx[1],
    		/*$$restProps*/ ctx[6]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	return {
    		c() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			set_attributes(a, a_data);
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen(a, "click", /*onClick*/ ctx[5]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, ariaCurrent*/ 32772)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, get_default_slot_changes$2),
    						get_default_slot_context$2
    					);
    				}
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				(!current || dirty & /*href*/ 1) && { href: /*href*/ ctx[0] },
    				(!current || dirty & /*ariaCurrent*/ 4) && { "aria-current": /*ariaCurrent*/ ctx[2] },
    				dirty & /*props*/ 2 && /*props*/ ctx[1],
    				dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6]
    			]));
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let ariaCurrent;
    	const omit_props_names = ["to","replace","state","getProps"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $location;
    	let $base;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { to = "#" } = $$props;
    	let { replace = false } = $$props;
    	let { state = {} } = $$props;
    	let { getProps = () => ({}) } = $$props;
    	const location = getContext(LOCATION);
    	component_subscribe($$self, location, value => $$invalidate(13, $location = value));
    	const { base } = getContext(ROUTER);
    	component_subscribe($$self, base, value => $$invalidate(14, $base = value));
    	const { navigate } = getContext(HISTORY);
    	const dispatch = createEventDispatcher();
    	let href, isPartiallyCurrent, isCurrent, props;

    	const onClick = event => {
    		dispatch("click", event);

    		if (shouldNavigate(event)) {
    			event.preventDefault();

    			// Don't push another entry to the history stack when the user
    			// clicks on a Link to the page they are currently on.
    			const shouldReplace = $location.pathname === href || replace;

    			navigate(href, { state, replace: shouldReplace });
    		}
    	};

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ('to' in $$new_props) $$invalidate(7, to = $$new_props.to);
    		if ('replace' in $$new_props) $$invalidate(8, replace = $$new_props.replace);
    		if ('state' in $$new_props) $$invalidate(9, state = $$new_props.state);
    		if ('getProps' in $$new_props) $$invalidate(10, getProps = $$new_props.getProps);
    		if ('$$scope' in $$new_props) $$invalidate(15, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*to, $base*/ 16512) {
    			$$invalidate(0, href = to === "/" ? $base.uri : resolve(to, $base.uri));
    		}

    		if ($$self.$$.dirty & /*$location, href*/ 8193) {
    			$$invalidate(11, isPartiallyCurrent = $location.pathname.startsWith(href));
    		}

    		if ($$self.$$.dirty & /*href, $location*/ 8193) {
    			$$invalidate(12, isCurrent = href === $location.pathname);
    		}

    		if ($$self.$$.dirty & /*isCurrent*/ 4096) {
    			$$invalidate(2, ariaCurrent = isCurrent ? "page" : undefined);
    		}

    		$$invalidate(1, props = getProps({
    			location: $location,
    			href,
    			isPartiallyCurrent,
    			isCurrent,
    			existingProps: $$restProps
    		}));
    	};

    	return [
    		href,
    		props,
    		ariaCurrent,
    		location,
    		base,
    		onClick,
    		$$restProps,
    		to,
    		replace,
    		state,
    		getProps,
    		isPartiallyCurrent,
    		isCurrent,
    		$location,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Link extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {
    			to: 7,
    			replace: 8,
    			state: 9,
    			getProps: 10
    		});
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.59.2 */
    const get_default_slot_changes$1 = dirty => ({ params: dirty & /*routeParams*/ 4 });
    const get_default_slot_context$1 = ctx => ({ params: /*routeParams*/ ctx[2] });

    // (42:0) {#if $activeRoute && $activeRoute.route === route}
    function create_if_block$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$2, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (51:4) {:else}
    function create_else_block$3(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[8].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[7], get_default_slot_context$1);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, routeParams*/ 132)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[7],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[7])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[7], dirty, get_default_slot_changes$1),
    						get_default_slot_context$1
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    // (43:4) {#if component}
    function create_if_block_1$2(ctx) {
    	let await_block_anchor;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 12,
    		blocks: [,,,]
    	};

    	handle_promise(promise = /*component*/ ctx[0], info);

    	return {
    		c() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		m(target, anchor) {
    			insert(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*component*/ 1 && promise !== (promise = /*component*/ ctx[0]) && handle_promise(promise, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};
    }

    // (1:0) <script>     import { getContext, onDestroy }
    function create_catch_block(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    // (44:49)              <svelte:component                 this={resolvedComponent?.default || resolvedComponent}
    function create_then_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*routeParams*/ ctx[2], /*routeProps*/ ctx[3]];
    	var switch_value = /*resolvedComponent*/ ctx[12]?.default || /*resolvedComponent*/ ctx[12];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return { props: switch_instance_props };
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component(switch_value, switch_props());
    	}

    	return {
    		c() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*routeParams, routeProps*/ 12)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (dirty & /*component*/ 1 && switch_value !== (switch_value = /*resolvedComponent*/ ctx[12]?.default || /*resolvedComponent*/ ctx[12])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    // (1:0) <script>     import { getContext, onDestroy }
    function create_pending_block(ctx) {
    	return {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};
    }

    function create_fragment$8(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[5] && create_if_block$5(ctx);

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	let routeParams = {};
    	let routeProps = {};
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	registerRoute(route);

    	onDestroy(() => {
    		unregisterRoute(route);
    	});

    	$$self.$$set = $$new_props => {
    		$$invalidate(11, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ('path' in $$new_props) $$invalidate(6, path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate(7, $$scope = $$new_props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($activeRoute && $activeRoute.route === route) {
    			$$invalidate(2, routeParams = $activeRoute.params);
    			const { component: c, path, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);

    			if (c) {
    				if (c.toString().startsWith("class ")) $$invalidate(0, component = c); else $$invalidate(0, component = c());
    			}

    			canUseDOM() && window?.scrollTo(0, 0);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		activeRoute,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { path: 6, component: 0 });
    	}
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier} [start]
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let started = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (started) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            started = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
                // We need to set this to false because callbacks can still happen despite having unsubscribed:
                // Callbacks might already be placed in the queue which doesn't know it should no longer
                // invoke this derived store.
                started = false;
            };
        });
    }

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     * https://github.com/reach/router/blob/master/LICENSE
     */

    const getLocation = (source) => {
        return {
            ...source.location,
            state: source.history.state,
            key: (source.history.state && source.history.state.key) || "initial",
        };
    };
    const createHistory = (source) => {
        const listeners = [];
        let location = getLocation(source);

        return {
            get location() {
                return location;
            },

            listen(listener) {
                listeners.push(listener);

                const popstateListener = () => {
                    location = getLocation(source);
                    listener({ location, action: "POP" });
                };

                source.addEventListener("popstate", popstateListener);

                return () => {
                    source.removeEventListener("popstate", popstateListener);
                    const index = listeners.indexOf(listener);
                    listeners.splice(index, 1);
                };
            },

            navigate(to, { state, replace = false } = {}) {
                state = { ...state, key: Date.now() + "" };
                // try...catch iOS Safari limits to 100 pushState calls
                try {
                    if (replace) source.history.replaceState(state, "", to);
                    else source.history.pushState(state, "", to);
                } catch (e) {
                    source.location[replace ? "replace" : "assign"](to);
                }
                location = getLocation(source);
                listeners.forEach((listener) =>
                    listener({ location, action: "PUSH" })
                );
                document.activeElement.blur();
            },
        };
    };
    // Stores history entries in memory for testing or other platforms like Native
    const createMemorySource = (initialPathname = "/") => {
        let index = 0;
        const stack = [{ pathname: initialPathname, search: "" }];
        const states = [];

        return {
            get location() {
                return stack[index];
            },
            addEventListener(name, fn) {},
            removeEventListener(name, fn) {},
            history: {
                get entries() {
                    return stack;
                },
                get index() {
                    return index;
                },
                get state() {
                    return states[index];
                },
                pushState(state, _, uri) {
                    const [pathname, search = ""] = uri.split("?");
                    index++;
                    stack.push({ pathname, search });
                    states.push(state);
                },
                replaceState(state, _, uri) {
                    const [pathname, search = ""] = uri.split("?");
                    stack[index] = { pathname, search };
                    states[index] = state;
                },
            },
        };
    };
    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const globalHistory = createHistory(
        canUseDOM() ? window : createMemorySource()
    );

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.59.2 */

    const get_default_slot_changes = dirty => ({
    	route: dirty & /*$activeRoute*/ 2,
    	location: dirty & /*$location*/ 1
    });

    const get_default_slot_context = ctx => ({
    	route: /*$activeRoute*/ ctx[1] && /*$activeRoute*/ ctx[1].uri,
    	location: /*$location*/ ctx[0]
    });

    function create_fragment$7(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[12].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[11], get_default_slot_context);

    	return {
    		c() {
    			if (default_slot) default_slot.c();
    		},
    		m(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, $activeRoute, $location*/ 2051)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[11],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[11])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[11], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $location;
    	let $routes;
    	let $base;
    	let $activeRoute;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	let { history = globalHistory } = $$props;
    	setContext(HISTORY, history);
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	component_subscribe($$self, routes, value => $$invalidate(9, $routes = value));
    	const activeRoute = writable(null);
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : history.location);

    	component_subscribe($$self, location, value => $$invalidate(0, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	component_subscribe($$self, base, value => $$invalidate(10, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (!activeRoute) return base;

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	const registerRoute = route => {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) return;

    			const matchingRoute = pick([route], $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => [...rs, route]);
    		}
    	};

    	const unregisterRoute = route => {
    		routes.update(rs => rs.filter(r => r !== route));
    	};

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = history.listen(event => {
    				location.set(event.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	$$self.$$set = $$props => {
    		if ('basepath' in $$props) $$invalidate(6, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(7, url = $$props.url);
    		if ('history' in $$props) $$invalidate(8, history = $$props.history);
    		if ('$$scope' in $$props) $$invalidate(11, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 1024) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			{
    				const { path: basepath } = $base;
    				routes.update(rs => rs.map(r => Object.assign(r, { path: combinePaths(basepath, r._path) })));
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 513) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		$location,
    		$activeRoute,
    		routes,
    		activeRoute,
    		location,
    		base,
    		basepath,
    		url,
    		history,
    		$routes,
    		$base,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { basepath: 6, url: 7, history: 8 });
    	}
    }

    /* src/Home.svelte generated by Svelte v3.59.2 */

    function create_if_block$4(ctx) {
    	let p;
    	let t;

    	return {
    		c() {
    			p = element("p");
    			t = text(/*error*/ ctx[1]);
    			attr(p, "class", "error svelte-1dili9t");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*error*/ 2) set_data(t, /*error*/ ctx[1]);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div;
    	let h1;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let p0;
    	let t5;
    	let p1;
    	let t7;
    	let if_block = /*error*/ ctx[1] && create_if_block$4(ctx);

    	return {
    		c() {
    			div = element("div");
    			h1 = element("h1");
    			t0 = text("Welcome to GPTFit, ");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = text("!");
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Get personalized workout programs, powered by AI.";
    			t5 = space();
    			p1 = element("p");
    			p1.textContent = "Use the navigation bar to access your profile, generate new workouts, or browse existing workouts.";
    			t7 = space();
    			if (if_block) if_block.c();
    			attr(h1, "class", "svelte-1dili9t");
    			attr(p0, "class", "svelte-1dili9t");
    			attr(p1, "class", "svelte-1dili9t");
    			attr(div, "class", "home-container svelte-1dili9t");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(h1, t0);
    			append(h1, t1);
    			append(h1, t2);
    			append(div, t3);
    			append(div, p0);
    			append(div, t5);
    			append(div, p1);
    			append(div, t7);
    			if (if_block) if_block.m(div, null);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 1) set_data(t1, /*name*/ ctx[0]);

    			if (/*error*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$4(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let name = 'User';
    	let error = null;

    	onMount(async () => {
    		try {
    			const response = await fetch('./profile', {
    				method: 'GET',
    				headers: {
    					'Content-Type': 'application/json',
    					'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    				}
    			});

    			if (!response.ok) {
    				const data = await response.json();
    				throw new Error(`Error: ${data.error}`);
    			}

    			const user = await response.json();
    			$$invalidate(0, name = user.name);
    		} catch(err) {
    			$$invalidate(1, error = err.message || "An error occurred.");
    		}
    	});

    	return [name, error];
    }

    class Home extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
    	}
    }

    /* src/Profile.svelte generated by Svelte v3.59.2 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[27] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[30] = list[i];
    	return child_ctx;
    }

    // (171:0) {:else}
    function create_else_block$2(ctx) {
    	let p;

    	return {
    		c() {
    			p = element("p");
    			p.textContent = "Loading...";
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (112:0) {#if user}
    function create_if_block$3(ctx) {
    	let h2;
    	let t1;
    	let t2;
    	let form;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let label1;
    	let t5;
    	let input1;
    	let t6;
    	let label2;
    	let t7;
    	let input2;
    	let t8;
    	let label3;
    	let t9;
    	let input3;
    	let t10;
    	let label4;
    	let t11;
    	let input4;
    	let t12;
    	let label5;
    	let t13;
    	let input5;
    	let t14;
    	let label6;
    	let t15;
    	let input6;
    	let t16;
    	let label7;
    	let t17;
    	let input7;
    	let t18;
    	let label8;
    	let t19;
    	let input8;
    	let t20;
    	let label9;
    	let t21;
    	let input9;
    	let t22;
    	let label10;
    	let t23;
    	let input10;
    	let t24;
    	let label11;
    	let t25;
    	let input11;
    	let t26;
    	let label12;
    	let t27;
    	let select0;
    	let each_blocks_3 = [];
    	let each0_lookup = new Map();
    	let t28;
    	let label13;
    	let t29;
    	let input12;
    	let t30;
    	let label14;
    	let t31;
    	let select1;
    	let option0;
    	let option1;
    	let option2;
    	let t35;
    	let label15;
    	let t36;
    	let select2;
    	let each_blocks_2 = [];
    	let each1_lookup = new Map();
    	let t37;
    	let label16;
    	let t38;
    	let select3;
    	let each_blocks_1 = [];
    	let each2_lookup = new Map();
    	let t39;
    	let label17;
    	let t40;
    	let input13;
    	let t41;
    	let label18;
    	let t42;
    	let select4;
    	let each_blocks = [];
    	let each3_lookup = new Map();
    	let t43;
    	let button;
    	let mounted;
    	let dispose;
    	let if_block = /*profileExists*/ ctx[1] && create_if_block_1$1(ctx);
    	let each_value_3 = /*exercises*/ ctx[5];
    	const get_key = ctx => /*exercise*/ ctx[30];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		let child_ctx = get_each_context_3(ctx, each_value_3, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_3[i] = create_each_block_3(key, child_ctx));
    	}

    	let each_value_2 = /*equipmentOptions*/ ctx[3];
    	const get_key_1 = ctx => /*equipment*/ ctx[33];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
    	}

    	let each_value_1 = /*exercises*/ ctx[5];
    	const get_key_2 = ctx => /*exercise*/ ctx[30];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key_2(child_ctx);
    		each2_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = /*daysOfWeek*/ ctx[4];
    	const get_key_3 = ctx => /*day*/ ctx[27];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key_3(child_ctx);
    		each3_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "You're logged in!";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			form = element("form");
    			label0 = element("label");
    			t3 = text("Name: ");
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			t5 = text("Age: ");
    			input1 = element("input");
    			t6 = space();
    			label2 = element("label");
    			t7 = text("Height: ");
    			input2 = element("input");
    			t8 = space();
    			label3 = element("label");
    			t9 = text("Weight: ");
    			input3 = element("input");
    			t10 = space();
    			label4 = element("label");
    			t11 = text("Gender: ");
    			input4 = element("input");
    			t12 = space();
    			label5 = element("label");
    			t13 = text("Years Trained: ");
    			input5 = element("input");
    			t14 = space();
    			label6 = element("label");
    			t15 = text("Type: ");
    			input6 = element("input");
    			t16 = space();
    			label7 = element("label");
    			t17 = text("Fitness Level: ");
    			input7 = element("input");
    			t18 = space();
    			label8 = element("label");
    			t19 = text("Injuries or Health Concerns: ");
    			input8 = element("input");
    			t20 = space();
    			label9 = element("label");
    			t21 = text("Fitness Goal: ");
    			input9 = element("input");
    			t22 = space();
    			label10 = element("label");
    			t23 = text("Target Timeframe: ");
    			input10 = element("input");
    			t24 = space();
    			label11 = element("label");
    			t25 = text("Specific Challenges: ");
    			input11 = element("input");
    			t26 = space();
    			label12 = element("label");
    			t27 = text("Favorite Exercises: \n            ");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t28 = space();
    			label13 = element("label");
    			t29 = text("Preferred Workout Duration (in minutes): ");
    			input12 = element("input");
    			t30 = space();
    			label14 = element("label");
    			t31 = text("Do you workout at gym or home? \n            ");
    			select1 = element("select");
    			option0 = element("option");
    			option0.textContent = "Select...";
    			option1 = element("option");
    			option1.textContent = "Gym";
    			option2 = element("option");
    			option2.textContent = "Home";
    			t35 = space();
    			label15 = element("label");
    			t36 = text("What equipment do you have access to? \n            ");
    			select2 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t37 = space();
    			label16 = element("label");
    			t38 = text("Exercise Blacklist: \n            ");
    			select3 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t39 = space();
    			label17 = element("label");
    			t40 = text("Frequency: ");
    			input13 = element("input");
    			t41 = space();
    			label18 = element("label");
    			t42 = text("Days You Can't Train: \n            ");
    			select4 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t43 = space();
    			button = element("button");
    			button.textContent = "Save";
    			attr(input0, "class", "svelte-164syd2");
    			attr(label0, "class", "svelte-164syd2");
    			attr(input1, "type", "number");
    			attr(input1, "class", "svelte-164syd2");
    			attr(label1, "class", "svelte-164syd2");
    			attr(input2, "class", "svelte-164syd2");
    			attr(label2, "class", "svelte-164syd2");
    			attr(input3, "class", "svelte-164syd2");
    			attr(label3, "class", "svelte-164syd2");
    			attr(input4, "class", "svelte-164syd2");
    			attr(label4, "class", "svelte-164syd2");
    			attr(input5, "type", "number");
    			attr(input5, "class", "svelte-164syd2");
    			attr(label5, "class", "svelte-164syd2");
    			attr(input6, "class", "svelte-164syd2");
    			attr(label6, "class", "svelte-164syd2");
    			attr(input7, "class", "svelte-164syd2");
    			attr(label7, "class", "svelte-164syd2");
    			attr(input8, "class", "svelte-164syd2");
    			attr(label8, "class", "svelte-164syd2");
    			attr(input9, "class", "svelte-164syd2");
    			attr(label9, "class", "svelte-164syd2");
    			attr(input10, "class", "svelte-164syd2");
    			attr(label10, "class", "svelte-164syd2");
    			attr(input11, "class", "svelte-164syd2");
    			attr(label11, "class", "svelte-164syd2");
    			select0.multiple = true;
    			attr(select0, "class", "svelte-164syd2");
    			if (/*user*/ ctx[0].favorite_exercises === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[19].call(select0));
    			attr(label12, "class", "svelte-164syd2");
    			attr(input12, "type", "number");
    			attr(input12, "class", "svelte-164syd2");
    			attr(label13, "class", "svelte-164syd2");
    			option0.__value = "";
    			option0.value = option0.__value;
    			option1.__value = "gym";
    			option1.value = option1.__value;
    			option2.__value = "home";
    			option2.value = option2.__value;
    			attr(select1, "class", "svelte-164syd2");
    			if (/*user*/ ctx[0].gym_or_home === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[21].call(select1));
    			attr(label14, "class", "svelte-164syd2");
    			select2.multiple = true;
    			attr(select2, "class", "svelte-164syd2");
    			if (/*user*/ ctx[0].equipment === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[22].call(select2));
    			attr(label15, "class", "svelte-164syd2");
    			select3.multiple = true;
    			attr(select3, "class", "svelte-164syd2");
    			if (/*user*/ ctx[0].exercise_blacklist === void 0) add_render_callback(() => /*select3_change_handler*/ ctx[23].call(select3));
    			attr(label16, "class", "svelte-164syd2");
    			attr(input13, "type", "number");
    			attr(input13, "class", "svelte-164syd2");
    			attr(label17, "class", "svelte-164syd2");
    			select4.multiple = true;
    			attr(select4, "class", "svelte-164syd2");
    			if (/*user*/ ctx[0].days_cant_train === void 0) add_render_callback(() => /*select4_change_handler*/ ctx[25].call(select4));
    			attr(label18, "class", "svelte-164syd2");
    			attr(button, "type", "submit");
    			attr(button, "class", "svelte-164syd2");
    			attr(form, "class", "svelte-164syd2");
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			insert(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t2, anchor);
    			insert(target, form, anchor);
    			append(form, label0);
    			append(label0, t3);
    			append(label0, input0);
    			set_input_value(input0, /*user*/ ctx[0].name);
    			append(form, t4);
    			append(form, label1);
    			append(label1, t5);
    			append(label1, input1);
    			set_input_value(input1, /*user*/ ctx[0].age);
    			append(form, t6);
    			append(form, label2);
    			append(label2, t7);
    			append(label2, input2);
    			set_input_value(input2, /*user*/ ctx[0].height);
    			append(form, t8);
    			append(form, label3);
    			append(label3, t9);
    			append(label3, input3);
    			set_input_value(input3, /*user*/ ctx[0].weight);
    			append(form, t10);
    			append(form, label4);
    			append(label4, t11);
    			append(label4, input4);
    			set_input_value(input4, /*user*/ ctx[0].gender);
    			append(form, t12);
    			append(form, label5);
    			append(label5, t13);
    			append(label5, input5);
    			set_input_value(input5, /*user*/ ctx[0].years_trained);
    			append(form, t14);
    			append(form, label6);
    			append(label6, t15);
    			append(label6, input6);
    			set_input_value(input6, /*user*/ ctx[0].type);
    			append(form, t16);
    			append(form, label7);
    			append(label7, t17);
    			append(label7, input7);
    			set_input_value(input7, /*user*/ ctx[0].fitness_level);
    			append(form, t18);
    			append(form, label8);
    			append(label8, t19);
    			append(label8, input8);
    			set_input_value(input8, /*user*/ ctx[0].injuries);
    			append(form, t20);
    			append(form, label9);
    			append(label9, t21);
    			append(label9, input9);
    			set_input_value(input9, /*user*/ ctx[0].fitness_goal);
    			append(form, t22);
    			append(form, label10);
    			append(label10, t23);
    			append(label10, input10);
    			set_input_value(input10, /*user*/ ctx[0].target_timeframe);
    			append(form, t24);
    			append(form, label11);
    			append(label11, t25);
    			append(label11, input11);
    			set_input_value(input11, /*user*/ ctx[0].challenges);
    			append(form, t26);
    			append(form, label12);
    			append(label12, t27);
    			append(label12, select0);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(select0, null);
    				}
    			}

    			select_options(select0, /*user*/ ctx[0].favorite_exercises);
    			append(form, t28);
    			append(form, label13);
    			append(label13, t29);
    			append(label13, input12);
    			set_input_value(input12, /*user*/ ctx[0].preferred_workout_duration);
    			append(form, t30);
    			append(form, label14);
    			append(label14, t31);
    			append(label14, select1);
    			append(select1, option0);
    			append(select1, option1);
    			append(select1, option2);
    			select_option(select1, /*user*/ ctx[0].gym_or_home, true);
    			append(form, t35);
    			append(form, label15);
    			append(label15, t36);
    			append(label15, select2);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select2, null);
    				}
    			}

    			select_options(select2, /*user*/ ctx[0].equipment);
    			append(form, t37);
    			append(form, label16);
    			append(label16, t38);
    			append(label16, select3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select3, null);
    				}
    			}

    			select_options(select3, /*user*/ ctx[0].exercise_blacklist);
    			append(form, t39);
    			append(form, label17);
    			append(label17, t40);
    			append(label17, input13);
    			set_input_value(input13, /*user*/ ctx[0].frequency);
    			append(form, t41);
    			append(form, label18);
    			append(label18, t42);
    			append(label18, select4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select4, null);
    				}
    			}

    			select_options(select4, /*user*/ ctx[0].days_cant_train);
    			append(form, t43);
    			append(form, button);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[8]),
    					listen(input2, "input", /*input2_input_handler*/ ctx[9]),
    					listen(input3, "input", /*input3_input_handler*/ ctx[10]),
    					listen(input4, "input", /*input4_input_handler*/ ctx[11]),
    					listen(input5, "input", /*input5_input_handler*/ ctx[12]),
    					listen(input6, "input", /*input6_input_handler*/ ctx[13]),
    					listen(input7, "input", /*input7_input_handler*/ ctx[14]),
    					listen(input8, "input", /*input8_input_handler*/ ctx[15]),
    					listen(input9, "input", /*input9_input_handler*/ ctx[16]),
    					listen(input10, "input", /*input10_input_handler*/ ctx[17]),
    					listen(input11, "input", /*input11_input_handler*/ ctx[18]),
    					listen(select0, "change", /*select0_change_handler*/ ctx[19]),
    					listen(input12, "input", /*input12_input_handler*/ ctx[20]),
    					listen(select1, "change", /*select1_change_handler*/ ctx[21]),
    					listen(select2, "change", /*select2_change_handler*/ ctx[22]),
    					listen(select3, "change", /*select3_change_handler*/ ctx[23]),
    					listen(input13, "input", /*input13_input_handler*/ ctx[24]),
    					listen(select4, "change", /*select4_change_handler*/ ctx[25]),
    					listen(form, "submit", prevent_default(/*saveProfile*/ ctx[6]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*profileExists*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input0.value !== /*user*/ ctx[0].name) {
    				set_input_value(input0, /*user*/ ctx[0].name);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && to_number(input1.value) !== /*user*/ ctx[0].age) {
    				set_input_value(input1, /*user*/ ctx[0].age);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input2.value !== /*user*/ ctx[0].height) {
    				set_input_value(input2, /*user*/ ctx[0].height);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input3.value !== /*user*/ ctx[0].weight) {
    				set_input_value(input3, /*user*/ ctx[0].weight);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input4.value !== /*user*/ ctx[0].gender) {
    				set_input_value(input4, /*user*/ ctx[0].gender);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && to_number(input5.value) !== /*user*/ ctx[0].years_trained) {
    				set_input_value(input5, /*user*/ ctx[0].years_trained);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input6.value !== /*user*/ ctx[0].type) {
    				set_input_value(input6, /*user*/ ctx[0].type);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input7.value !== /*user*/ ctx[0].fitness_level) {
    				set_input_value(input7, /*user*/ ctx[0].fitness_level);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input8.value !== /*user*/ ctx[0].injuries) {
    				set_input_value(input8, /*user*/ ctx[0].injuries);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input9.value !== /*user*/ ctx[0].fitness_goal) {
    				set_input_value(input9, /*user*/ ctx[0].fitness_goal);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input10.value !== /*user*/ ctx[0].target_timeframe) {
    				set_input_value(input10, /*user*/ ctx[0].target_timeframe);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && input11.value !== /*user*/ ctx[0].challenges) {
    				set_input_value(input11, /*user*/ ctx[0].challenges);
    			}

    			if (dirty[0] & /*exercises*/ 32) {
    				each_value_3 = /*exercises*/ ctx[5];
    				each_blocks_3 = update_keyed_each(each_blocks_3, dirty, get_key, 1, ctx, each_value_3, each0_lookup, select0, destroy_block, create_each_block_3, null, get_each_context_3);
    			}

    			if (dirty[0] & /*user, exercises*/ 33) {
    				select_options(select0, /*user*/ ctx[0].favorite_exercises);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && to_number(input12.value) !== /*user*/ ctx[0].preferred_workout_duration) {
    				set_input_value(input12, /*user*/ ctx[0].preferred_workout_duration);
    			}

    			if (dirty[0] & /*user, exercises*/ 33) {
    				select_option(select1, /*user*/ ctx[0].gym_or_home);
    			}

    			if (dirty[0] & /*equipmentOptions*/ 8) {
    				each_value_2 = /*equipmentOptions*/ ctx[3];
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key_1, 1, ctx, each_value_2, each1_lookup, select2, destroy_block, create_each_block_2, null, get_each_context_2);
    			}

    			if (dirty[0] & /*user, exercises*/ 33) {
    				select_options(select2, /*user*/ ctx[0].equipment);
    			}

    			if (dirty[0] & /*exercises*/ 32) {
    				each_value_1 = /*exercises*/ ctx[5];
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_2, 1, ctx, each_value_1, each2_lookup, select3, destroy_block, create_each_block_1, null, get_each_context_1);
    			}

    			if (dirty[0] & /*user, exercises*/ 33) {
    				select_options(select3, /*user*/ ctx[0].exercise_blacklist);
    			}

    			if (dirty[0] & /*user, exercises*/ 33 && to_number(input13.value) !== /*user*/ ctx[0].frequency) {
    				set_input_value(input13, /*user*/ ctx[0].frequency);
    			}

    			if (dirty[0] & /*daysOfWeek*/ 16) {
    				each_value = /*daysOfWeek*/ ctx[4];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_3, 1, ctx, each_value, each3_lookup, select4, destroy_block, create_each_block$1, null, get_each_context$1);
    			}

    			if (dirty[0] & /*user, exercises*/ 33) {
    				select_options(select4, /*user*/ ctx[0].days_cant_train);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    			if (detaching) detach(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t2);
    			if (detaching) detach(form);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].d();
    			}

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].d();
    			}

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (114:4) {#if profileExists}
    function create_if_block_1$1(ctx) {
    	let if_block_anchor;
    	let if_block = /*dataSaved*/ ctx[2] && create_if_block_2$1();

    	return {
    		c() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (/*dataSaved*/ ctx[2]) {
    				if (if_block) ; else {
    					if_block = create_if_block_2$1();
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (115:8) {#if dataSaved}
    function create_if_block_2$1(ctx) {
    	let p;

    	return {
    		c() {
    			p = element("p");
    			p.textContent = "Your data has been saved successfully!";
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (134:16) {#each exercises as exercise (exercise)}
    function create_each_block_3(key_1, ctx) {
    	let option;
    	let t_value = /*exercise*/ ctx[30] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*exercise*/ ctx[30];
    			option.value = option.__value;
    			this.first = option;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (149:16) {#each equipmentOptions as equipment (equipment)}
    function create_each_block_2(key_1, ctx) {
    	let option;
    	let t_value = /*equipment*/ ctx[33] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*equipment*/ ctx[33];
    			option.value = option.__value;
    			this.first = option;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (156:16) {#each exercises as exercise (exercise)}
    function create_each_block_1(key_1, ctx) {
    	let option;
    	let t_value = /*exercise*/ ctx[30] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*exercise*/ ctx[30];
    			option.value = option.__value;
    			this.first = option;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (164:16) {#each daysOfWeek as day (day)}
    function create_each_block$1(key_1, ctx) {
    	let option;
    	let t_value = /*day*/ ctx[27] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*day*/ ctx[27];
    			option.value = option.__value;
    			this.first = option;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*user*/ ctx[0]) return create_if_block$3;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
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
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let user = {
    		name: 'Name not specified',
    		age: 'Age not specified',
    		height: 'Height not specified',
    		weight: 'Weight not specified',
    		gender: 'Gender not specified',
    		years_trained: 'Years trained not specified',
    		type: 'Type not specified',
    		fitness_level: 'Fitness level not specified',
    		injuries: 'No injuries or health concerns specified',
    		fitness_goal: 'Fitness goal not specified',
    		target_timeframe: 'Target timeframe not specified',
    		challenges: 'No specific challenges specified',
    		favorite_exercises: [],
    		exercise_blacklist: [],
    		frequency: 'Training frequency not specified',
    		days_cant_train: [],
    		preferred_workout_duration: 'Preferred workout duration not specified',
    		gym_or_home: 'Gym or home preference not specified',
    		equipment: []
    	};

    	const equipmentOptions = [
    		'Dumbbells',
    		'Barbell',
    		'Kettlebells',
    		'Resistance Bands',
    		'Treadmill',
    		'Stationary Bike'
    	];

    	let profileExists = false;
    	let dataSaved = false;
    	let error = null;
    	const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    	const exercises = [
    		'Squats',
    		'Deadlift',
    		'Bench Press',
    		'Pullups',
    		'Pushups',
    		'Crunches',
    		'Lunges'
    	];

    	onMount(async () => {
    		const response = await fetch('./profile', {
    			method: 'GET',
    			headers: {
    				'Content-Type': 'application/json',
    				'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    			}
    		});

    		if (response.ok) {
    			const userProfile = await response.json();
    			await tick();
    			$$invalidate(0, user = { ...user, ...userProfile });

    			if (Object.keys(userProfile).length) {
    				$$invalidate(1, profileExists = true);
    			}
    		} else {
    			error = await response.text(); // get error message
    			console.error(error); // print error message to console
    		}
    	});

    	async function saveProfile() {
    		const response = await fetch('./profile', {
    			method: 'POST',
    			headers: {
    				'Content-Type': 'application/json',
    				'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    			},
    			body: JSON.stringify(user)
    		});

    		if (response.ok) {
    			const updatedUser = await response.json();
    			await tick();
    			$$invalidate(0, user = { ...user, ...updatedUser });
    			$$invalidate(1, profileExists = true);
    			$$invalidate(2, dataSaved = true);
    		} else {
    			error = await response.text(); // get error message
    			console.error(error); // print error message to console
    			alert(error);
    		}
    	}

    	function input0_input_handler() {
    		user.name = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input1_input_handler() {
    		user.age = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input2_input_handler() {
    		user.height = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input3_input_handler() {
    		user.weight = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input4_input_handler() {
    		user.gender = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input5_input_handler() {
    		user.years_trained = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input6_input_handler() {
    		user.type = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input7_input_handler() {
    		user.fitness_level = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input8_input_handler() {
    		user.injuries = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input9_input_handler() {
    		user.fitness_goal = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input10_input_handler() {
    		user.target_timeframe = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input11_input_handler() {
    		user.challenges = this.value;
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function select0_change_handler() {
    		user.favorite_exercises = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input12_input_handler() {
    		user.preferred_workout_duration = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function select1_change_handler() {
    		user.gym_or_home = select_value(this);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function select2_change_handler() {
    		user.equipment = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function select3_change_handler() {
    		user.exercise_blacklist = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function input13_input_handler() {
    		user.frequency = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	function select4_change_handler() {
    		user.days_cant_train = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(5, exercises);
    	}

    	return [
    		user,
    		profileExists,
    		dataSaved,
    		equipmentOptions,
    		daysOfWeek,
    		exercises,
    		saveProfile,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler,
    		input5_input_handler,
    		input6_input_handler,
    		input7_input_handler,
    		input8_input_handler,
    		input9_input_handler,
    		input10_input_handler,
    		input11_input_handler,
    		select0_change_handler,
    		input12_input_handler,
    		select1_change_handler,
    		select2_change_handler,
    		select3_change_handler,
    		input13_input_handler,
    		select4_change_handler
    	];
    }

    class Profile extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {}, null, [-1, -1]);
    	}
    }

    /* src/Browse.svelte generated by Svelte v3.59.2 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (49:4) {#each responses as response (response.id)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let h2;
    	let t0_value = /*response*/ ctx[1].prompt + "";
    	let t0;
    	let t1;
    	let pre;
    	let t2_value = /*response*/ ctx[1].response + "";
    	let t2;
    	let t3;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			div = element("div");
    			h2 = element("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			pre = element("pre");
    			t2 = text(t2_value);
    			t3 = space();
    			attr(pre, "class", "svelte-gse0yl");
    			attr(div, "class", "response-item svelte-gse0yl");
    			this.first = div;
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h2);
    			append(h2, t0);
    			append(div, t1);
    			append(div, pre);
    			append(pre, t2);
    			append(div, t3);
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*responses*/ 1 && t0_value !== (t0_value = /*response*/ ctx[1].prompt + "")) set_data(t0, t0_value);
    			if (dirty & /*responses*/ 1 && t2_value !== (t2_value = /*response*/ ctx[1].response + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$4(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let each_value = /*responses*/ ctx[0];
    	const get_key = ctx => /*response*/ ctx[1].id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	return {
    		c() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Previous Responses";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "container svelte-gse0yl");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(div, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*responses*/ 1) {
    				each_value = /*responses*/ ctx[0];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div, destroy_block, create_each_block, null, get_each_context);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let responses = [];

    	onMount(async () => {
    		const res = await fetch('/responses', {
    			headers: {
    				'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    			}
    		});

    		$$invalidate(0, responses = await res.json());
    	});

    	return [responses];
    }

    class Browse extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* src/Generate.svelte generated by Svelte v3.59.2 */

    function create_else_block$1(ctx) {
    	let t0;
    	let button;
    	let t2;
    	let pre;
    	let t3;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*$user*/ ctx[4]) return create_if_block_2;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			if_block.c();
    			t0 = space();
    			button = element("button");
    			button.textContent = "Generate";
    			t2 = space();
    			pre = element("pre");
    			t3 = text(/*generatedText*/ ctx[0]);
    			attr(button, "class", "generate-btn svelte-1chnff6");
    			attr(pre, "class", "svelte-1chnff6");
    		},
    		m(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, t0, anchor);
    			insert(target, button, anchor);
    			insert(target, t2, anchor);
    			insert(target, pre, anchor);
    			append(pre, t3);

    			if (!mounted) {
    				dispose = listen(button, "click", /*generateText*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t0.parentNode, t0);
    				}
    			}

    			if (dirty & /*generatedText*/ 1) set_data(t3, /*generatedText*/ ctx[0]);
    		},
    		d(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach(t0);
    			if (detaching) detach(button);
    			if (detaching) detach(t2);
    			if (detaching) detach(pre);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (140:22) 
    function create_if_block_1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			div.textContent = "Loading...";
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (138:2) {#if error}
    function create_if_block$2(ctx) {
    	let div;
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(/*error*/ ctx[2]);
    			attr(div, "class", "error");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data(t, /*error*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (145:4) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	return {
    		c() {
    			p = element("p");
    			p.textContent = "Loading user data...";
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(p);
    		}
    	};
    }

    // (143:4) {#if $user}
    function create_if_block_2(ctx) {
    	let textarea;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			textarea = element("textarea");
    			attr(textarea, "class", "text-area svelte-1chnff6");
    		},
    		m(target, anchor) {
    			insert(target, textarea, anchor);
    			set_input_value(textarea, /*$prompt*/ ctx[3]);

    			if (!mounted) {
    				dispose = listen(textarea, "input", /*textarea_input_handler*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$prompt*/ 8) {
    				set_input_value(textarea, /*$prompt*/ ctx[3]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(textarea);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div;
    	let h1;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (/*error*/ ctx[2]) return create_if_block$2;
    		if (/*isLoading*/ ctx[1]) return create_if_block_1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	return {
    		c() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Your Custom Workout Plan";
    			t1 = space();
    			if_block.c();
    			attr(div, "class", "container svelte-1chnff6");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(div, t1);
    			if_block.m(div, null);
    		},
    		p(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			if_block.d();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $prompt;
    	let $user;

    	const user = writable({
    		frequency: '',
    		type: [],
    		days_cant_train: [],
    		favorite_exercises: []
    	});

    	component_subscribe($$self, user, value => $$invalidate(4, $user = value));
    	let generatedText = '';
    	let isLoading = false;
    	let error = null;

    	// define prompt as a derived store
    	const prompt = derived(user, $user => {
    		if ($user.name) {
    			// or check for any required property
    			return `My name is ${$user.name} and I am ${$user.age} years old. I am ${$user.height} feet tall and I weigh ${$user.weight} pounds. I am ${$user.gender} and I have been training for ${$user.years_trained} years. 
      I am a ${$user.type} type of trainer and I prefer to work out ${$user.frequency} times a week. On these days: ${$user.days_cant_train.join(", ")} I can't train. I especially enjoy these exercises: ${$user.favorite_exercises.join(", ")}. 
      I prefer my workouts to be ${$user.preferred_workout_duration} minutes long and I ${$user.gym_or_home === 'gym'
			? 'have access to a gym'
			: 'prefer to workout at home'}. 
      My fitness level is ${$user.fitness_level}. I have the following injuries: ${$user.injuries}. My fitness goal is ${$user.fitness_goal} and I aim to reach it in ${$user.target_timeframe}. 
      The challenges I face in reaching my fitness goals are: ${$user.challenges}. The exercises I avoid are: ${$user.exercise_blacklist}. 
      The equipment I have available for my workouts include: ${$user.equipment.join(", ")}.`;
    		} else {
    			return ''; // default value
    		}
    	});

    	component_subscribe($$self, prompt, value => $$invalidate(3, $prompt = value));

    	async function generateText() {
    		$$invalidate(1, isLoading = true);
    		$$invalidate(2, error = null);

    		try {
    			const response = await fetch("./generate", {
    				method: 'POST',
    				headers: {
    					'Content-Type': 'application/json',
    					'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    				},
    				body: JSON.stringify({ prompt: $prompt, max_tokens: 1000 })
    			});

    			const data = await response.json();

    			if (!response.ok) {
    				throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(data)}`);
    			}

    			$$invalidate(0, generatedText = data);
    		} catch(e) {
    			$$invalidate(2, error = e.message);
    		} finally {
    			$$invalidate(1, isLoading = false);
    		}
    	}

    	onMount(async () => {
    		const response = await fetch('./profile', {
    			method: 'GET',
    			headers: {
    				'Content-Type': 'application/json',
    				'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    			}
    		});

    		if (response.ok) {
    			const userProfile = await response.json();
    			console.log('userProfile:', userProfile); // Add this line
    			console.log('current user:', get_store_value(user)); // Add this line

    			if (userProfile && get_store_value(user)) {
    				// Check if both userProfile and get(user) are not undefined
    				user.set({ ...get_store_value(user), ...userProfile });
    			} else {
    				$$invalidate(2, error = "Failed to load user profile.");
    			}
    		} else {
    			$$invalidate(2, error = "Failed to load user profile.");
    		}
    	});

    	function textarea_input_handler() {
    		$prompt = this.value;
    		prompt.set($prompt);
    	}

    	return [
    		generatedText,
    		isLoading,
    		error,
    		$prompt,
    		$user,
    		user,
    		prompt,
    		generateText,
    		textarea_input_handler
    	];
    }

    class Generate extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    const auth = writable({
        isAuth: false,
        username: '',
    });

    /* src/Login.svelte generated by Svelte v3.59.2 */

    function create_if_block$1(ctx) {
    	let p0;
    	let t1;
    	let p1;
    	let t2;

    	return {
    		c() {
    			p0 = element("p");
    			p0.textContent = "Failed to log in. Please check your credentials.";
    			t1 = space();
    			p1 = element("p");
    			t2 = text(/*errorMessage*/ ctx[4]);
    			set_style(p0, "color", "red");
    			set_style(p1, "color", "red");
    		},
    		m(target, anchor) {
    			insert(target, p0, anchor);
    			insert(target, t1, anchor);
    			insert(target, p1, anchor);
    			append(p1, t2);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*errorMessage*/ 16) set_data(t2, /*errorMessage*/ ctx[4]);
    		},
    		d(detaching) {
    			if (detaching) detach(p0);
    			if (detaching) detach(t1);
    			if (detaching) detach(p1);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let form;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button;
    	let t3;
    	let mounted;
    	let dispose;
    	let if_block = /*attemptedLogin*/ ctx[3] && !/*loggedIn*/ ctx[2] && create_if_block$1(ctx);

    	return {
    		c() {
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "Log In";
    			t3 = space();
    			if (if_block) if_block.c();
    			attr(input0, "type", "email");
    			attr(input0, "placeholder", "Email");
    			attr(input0, "class", "svelte-1wm3ioj");
    			attr(input1, "type", "password");
    			attr(input1, "placeholder", "Password");
    			attr(input1, "class", "svelte-1wm3ioj");
    			attr(button, "type", "submit");
    			attr(button, "class", "svelte-1wm3ioj");
    			attr(form, "class", "svelte-1wm3ioj");
    		},
    		m(target, anchor) {
    			insert(target, form, anchor);
    			append(form, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append(form, t0);
    			append(form, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append(form, t1);
    			append(form, button);
    			append(form, t3);
    			if (if_block) if_block.m(form, null);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen(form, "submit", prevent_default(/*login*/ ctx[5]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (/*attemptedLogin*/ ctx[3] && !/*loggedIn*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(form, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(form);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    async function getCsrfToken() {
    	const response = await fetch('./csrf_token', { method: 'GET' });

    	if (response.ok) {
    		const data = await response.json();
    		console.log("Got back CsrfToken");
    		return data.csrfToken;
    	} else {
    		alert('Failed to fetch CSRF token.');
    		return null;
    	}
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let email = '';
    	let password = '';
    	let loggedIn = false;
    	let attemptedLogin = false;
    	let errorMessage = '';

    	async function login() {
    		const csrfToken = await getCsrfToken();

    		const response = await fetch('./login', {
    			method: 'POST',
    			headers: { 'Content-Type': 'application/json' },
    			body: JSON.stringify({ email, password, csrf_token: csrfToken }),
    			credentials: 'include'
    		});

    		$$invalidate(3, attemptedLogin = true);

    		if (!response.ok) {
    			console.log("Response not okay");

    			try {
    				const data = await response.json();
    				$$invalidate(4, errorMessage = data.message); // Expect a 'message' key in the JSON response
    			} catch(error) {
    				$$invalidate(4, errorMessage = `Failed to log in. Status: ${response.status}`);
    			}

    			alert(errorMessage);
    			return;
    		}

    		const data = await response.json();
    		console.log(data);
    		auth.set({ isAuth: true, username: email });
    		$$invalidate(2, loggedIn = true);
    		localStorage.setItem('auth_token', data.auth_token);
    	}

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	return [
    		email,
    		password,
    		loggedIn,
    		attemptedLogin,
    		errorMessage,
    		login,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class Login extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* src/Register.svelte generated by Svelte v3.59.2 */

    function create_fragment$1(ctx) {
    	let form;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "Register";
    			attr(input0, "type", "email");
    			attr(input0, "placeholder", "Email");
    			attr(input1, "type", "password");
    			attr(input1, "placeholder", "Password");
    			attr(button, "type", "submit");
    		},
    		m(target, anchor) {
    			insert(target, form, anchor);
    			append(form, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append(form, t0);
    			append(form, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append(form, t1);
    			append(form, button);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[4]),
    					listen(form, "submit", prevent_default(/*register*/ ctx[2]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let email = '';
    	let password = '';

    	async function register() {
    		const response = await fetch('./register', {
    			method: 'POST',
    			headers: { 'Content-Type': 'application/json' },
    			body: JSON.stringify({ email, password })
    		});

    		const data = await response.json();

    		if (response.ok) {
    			alert('Successfully registered!');
    		} else {
    			alert(`Failed to register. Reason: ${JSON.stringify(data)}`);
    		}
    	}

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	return [email, password, register, input0_input_handler, input1_input_handler];
    }

    class Register extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    function create_default_slot_6(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Home");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (73:4) <Link to="/profile">
    function create_default_slot_5(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Profile");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (74:4) <Link to="/generate">
    function create_default_slot_4(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Generate Workout");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (75:4) <Link to="/browse">
    function create_default_slot_3(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Browse Workouts");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (79:4) {:else}
    function create_else_block(ctx) {
    	let link0;
    	let t;
    	let link1;
    	let current;

    	link0 = new Link({
    			props: {
    				to: "/login",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			}
    		});

    	link1 = new Link({
    			props: {
    				to: "/register",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(link0.$$.fragment);
    			t = space();
    			create_component(link1.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(link0, target, anchor);
    			insert(target, t, anchor);
    			mount_component(link1, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(link0, detaching);
    			if (detaching) detach(t);
    			destroy_component(link1, detaching);
    		}
    	};
    }

    // (76:4) {#if authState.isAuth || isAuth}
    function create_if_block(ctx) {
    	let span;
    	let t0;
    	let t1_value = (/*authState*/ ctx[2].username || /*username*/ ctx[1]) + "";
    	let t1;
    	let t2;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			span = element("span");
    			t0 = text("Logged in as ");
    			t1 = text(t1_value);
    			t2 = space();
    			button = element("button");
    			button.textContent = "Logout";
    		},
    		m(target, anchor) {
    			insert(target, span, anchor);
    			append(span, t0);
    			append(span, t1);
    			insert(target, t2, anchor);
    			insert(target, button, anchor);

    			if (!mounted) {
    				dispose = listen(button, "click", /*logout*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*authState, username*/ 6 && t1_value !== (t1_value = (/*authState*/ ctx[2].username || /*username*/ ctx[1]) + "")) set_data(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(span);
    			if (detaching) detach(t2);
    			if (detaching) detach(button);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (80:6) <Link to="/login">
    function create_default_slot_2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Login");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (81:6) <Link to="/register">
    function create_default_slot_1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Register");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (70:0) <Router>
    function create_default_slot(ctx) {
    	let nav;
    	let link0;
    	let t0;
    	let link1;
    	let t1;
    	let link2;
    	let t2;
    	let link3;
    	let t3;
    	let current_block_type_index;
    	let if_block;
    	let t4;
    	let route0;
    	let t5;
    	let route1;
    	let t6;
    	let route2;
    	let t7;
    	let route3;
    	let t8;
    	let route4;
    	let t9;
    	let route5;
    	let current;

    	link0 = new Link({
    			props: {
    				to: "/",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			}
    		});

    	link1 = new Link({
    			props: {
    				to: "/profile",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			}
    		});

    	link2 = new Link({
    			props: {
    				to: "/generate",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			}
    		});

    	link3 = new Link({
    			props: {
    				to: "/browse",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			}
    		});

    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*authState*/ ctx[2].isAuth || /*isAuth*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	route0 = new Route({ props: { path: "/", component: Home } });

    	route1 = new Route({
    			props: { path: "/profile", component: Profile }
    		});

    	route2 = new Route({
    			props: { path: "/generate", component: Generate }
    		});

    	route3 = new Route({
    			props: { path: "/browse", component: Browse }
    		});

    	route4 = new Route({
    			props: { path: "/login", component: Login }
    		});

    	route5 = new Route({
    			props: { path: "/register", component: Register }
    		});

    	return {
    		c() {
    			nav = element("nav");
    			create_component(link0.$$.fragment);
    			t0 = space();
    			create_component(link1.$$.fragment);
    			t1 = space();
    			create_component(link2.$$.fragment);
    			t2 = space();
    			create_component(link3.$$.fragment);
    			t3 = space();
    			if_block.c();
    			t4 = space();
    			create_component(route0.$$.fragment);
    			t5 = space();
    			create_component(route1.$$.fragment);
    			t6 = space();
    			create_component(route2.$$.fragment);
    			t7 = space();
    			create_component(route3.$$.fragment);
    			t8 = space();
    			create_component(route4.$$.fragment);
    			t9 = space();
    			create_component(route5.$$.fragment);
    			attr(nav, "class", "navbar svelte-n3svrj");
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			mount_component(link0, nav, null);
    			append(nav, t0);
    			mount_component(link1, nav, null);
    			append(nav, t1);
    			mount_component(link2, nav, null);
    			append(nav, t2);
    			mount_component(link3, nav, null);
    			append(nav, t3);
    			if_blocks[current_block_type_index].m(nav, null);
    			insert(target, t4, anchor);
    			mount_component(route0, target, anchor);
    			insert(target, t5, anchor);
    			mount_component(route1, target, anchor);
    			insert(target, t6, anchor);
    			mount_component(route2, target, anchor);
    			insert(target, t7, anchor);
    			mount_component(route3, target, anchor);
    			insert(target, t8, anchor);
    			mount_component(route4, target, anchor);
    			insert(target, t9, anchor);
    			mount_component(route5, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);
    			const link3_changes = {};

    			if (dirty & /*$$scope*/ 32) {
    				link3_changes.$$scope = { dirty, ctx };
    			}

    			link3.$set(link3_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(nav, null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			transition_in(link3.$$.fragment, local);
    			transition_in(if_block);
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			transition_in(route4.$$.fragment, local);
    			transition_in(route5.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			transition_out(link3.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(nav);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    			destroy_component(link3);
    			if_blocks[current_block_type_index].d();
    			if (detaching) detach(t4);
    			destroy_component(route0, detaching);
    			if (detaching) detach(t5);
    			destroy_component(route1, detaching);
    			if (detaching) detach(t6);
    			destroy_component(route2, detaching);
    			if (detaching) detach(t7);
    			destroy_component(route3, detaching);
    			if (detaching) detach(t8);
    			destroy_component(route4, detaching);
    			if (detaching) detach(t9);
    			destroy_component(route5, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let router;
    	let current;

    	router = new Router({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(router.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope, authState, username, isAuth*/ 39) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(router, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let isAuth = false;
    	let username = "";
    	let authState = {};

    	auth.subscribe(value => {
    		$$invalidate(2, authState = value);
    	});

    	const fetchAuthStatus = async () => {
    		const response = await fetch("./auth_status");
    		const { is_authenticated, email } = await response.json();
    		$$invalidate(0, isAuth = is_authenticated);
    		$$invalidate(1, username = email || "");
    	};

    	const logout = async () => {
    		const response = await fetch("./logout", { method: "POST" });

    		if (response.ok) {
    			$$invalidate(0, isAuth = false);
    			$$invalidate(1, username = "");
    		}
    	};

    	onMount(fetchAuthStatus);
    	return [isAuth, username, authState, logout];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
