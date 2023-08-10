
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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
    	const if_block_creators = [create_if_block_1$3, create_else_block$3];
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
    function create_if_block_1$3(ctx) {
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
    	child_ctx[33] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[39] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[36] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[44] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[47] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[47] = list[i];
    	return child_ctx;
    }

    // (226:0) {:else}
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

    // (139:0) {#if user}
    function create_if_block$3(ctx) {
    	let h2;
    	let t1;
    	let t2;
    	let form;
    	let h30;
    	let t4;
    	let label0;
    	let t5;
    	let input0;
    	let t6;
    	let label1;
    	let t7;
    	let input1;
    	let t8;
    	let label2;
    	let t9;
    	let input2;
    	let t10;
    	let select0;
    	let t11;
    	let label3;
    	let t12;
    	let input3;
    	let t13;
    	let select1;
    	let t14;
    	let label4;
    	let t15;
    	let select2;
    	let option0;
    	let t17;
    	let h31;
    	let t19;
    	let label5;
    	let t20;
    	let input4;
    	let t21;
    	let label6;
    	let t22;
    	let input5;
    	let t23;
    	let label7;
    	let t24;
    	let input6;
    	let t25;
    	let label8;
    	let t26;
    	let input7;
    	let t27;
    	let label9;
    	let t28;
    	let input8;
    	let t29;
    	let label10;
    	let t30;
    	let input9;
    	let t31;
    	let h32;
    	let t33;
    	let label11;
    	let t34;
    	let select3;
    	let each_blocks_3 = [];
    	let each3_lookup = new Map();
    	let t35;
    	let label12;
    	let t36;
    	let input10;
    	let t37;
    	let label13;
    	let t38;
    	let select4;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let t43;
    	let label14;
    	let t44;
    	let select5;
    	let each_blocks_2 = [];
    	let each4_lookup = new Map();
    	let t45;
    	let label15;
    	let t46;
    	let select6;
    	let each_blocks_1 = [];
    	let each5_lookup = new Map();
    	let t47;
    	let label16;
    	let t48;
    	let input11;
    	let t49;
    	let label17;
    	let t50;
    	let select7;
    	let each_blocks = [];
    	let each6_lookup = new Map();
    	let t51;
    	let button;
    	let mounted;
    	let dispose;
    	let if_block = /*profileExists*/ ctx[1] && create_if_block_1$2(ctx);
    	let each_value_6 = /*heightUnits*/ ctx[7];
    	let each_blocks_6 = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks_6[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	let each_value_5 = /*weightUnits*/ ctx[8];
    	let each_blocks_5 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_5[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_4 = /*genderOptions*/ ctx[6];
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*exercises*/ ctx[5];
    	const get_key = ctx => /*exercise*/ ctx[36];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		let child_ctx = get_each_context_3(ctx, each_value_3, i);
    		let key = get_key(child_ctx);
    		each3_lookup.set(key, each_blocks_3[i] = create_each_block_3(key, child_ctx));
    	}

    	let each_value_2 = /*equipmentOptions*/ ctx[3];
    	const get_key_1 = ctx => /*equipment*/ ctx[39];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		let child_ctx = get_each_context_2(ctx, each_value_2, i);
    		let key = get_key_1(child_ctx);
    		each4_lookup.set(key, each_blocks_2[i] = create_each_block_2(key, child_ctx));
    	}

    	let each_value_1 = /*exercises*/ ctx[5];
    	const get_key_2 = ctx => /*exercise*/ ctx[36];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key_2(child_ctx);
    		each5_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = /*daysOfWeek*/ ctx[4];
    	const get_key_3 = ctx => /*day*/ ctx[33];

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$1(ctx, each_value, i);
    		let key = get_key_3(child_ctx);
    		each6_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
    	}

    	return {
    		c() {
    			h2 = element("h2");
    			h2.textContent = "You're logged in!";
    			t1 = space();
    			if (if_block) if_block.c();
    			t2 = space();
    			form = element("form");
    			h30 = element("h3");
    			h30.textContent = "Personal Information";
    			t4 = space();
    			label0 = element("label");
    			t5 = text("Name: ");
    			input0 = element("input");
    			t6 = space();
    			label1 = element("label");
    			t7 = text("Age: ");
    			input1 = element("input");
    			t8 = space();
    			label2 = element("label");
    			t9 = text("Height: \n            ");
    			input2 = element("input");
    			t10 = space();
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_6.length; i += 1) {
    				each_blocks_6[i].c();
    			}

    			t11 = space();
    			label3 = element("label");
    			t12 = text("Weight: \n            ");
    			input3 = element("input");
    			t13 = space();
    			select1 = element("select");

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].c();
    			}

    			t14 = space();
    			label4 = element("label");
    			t15 = text("Gender:\n            ");
    			select2 = element("select");
    			option0 = element("option");
    			option0.textContent = "Select...";

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t17 = space();
    			h31 = element("h3");
    			h31.textContent = "Fitness Information";
    			t19 = space();
    			label5 = element("label");
    			t20 = text("Years Trained: ");
    			input4 = element("input");
    			t21 = space();
    			label6 = element("label");
    			t22 = text("Fitness Level: ");
    			input5 = element("input");
    			t23 = space();
    			label7 = element("label");
    			t24 = text("Injuries or Health Concerns: ");
    			input6 = element("input");
    			t25 = space();
    			label8 = element("label");
    			t26 = text("Fitness Goal: ");
    			input7 = element("input");
    			t27 = space();
    			label9 = element("label");
    			t28 = text("Target Timeframe: ");
    			input8 = element("input");
    			t29 = space();
    			label10 = element("label");
    			t30 = text("Specific Challenges: ");
    			input9 = element("input");
    			t31 = space();
    			h32 = element("h3");
    			h32.textContent = "Workout Preferences";
    			t33 = space();
    			label11 = element("label");
    			t34 = text("Favorite Exercises:\n            ");
    			select3 = element("select");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t35 = space();
    			label12 = element("label");
    			t36 = text("Preferred Workout Duration (in minutes): ");
    			input10 = element("input");
    			t37 = space();
    			label13 = element("label");
    			t38 = text("Do you workout at gym or home?\n            ");
    			select4 = element("select");
    			option1 = element("option");
    			option1.textContent = "Select...";
    			option2 = element("option");
    			option2.textContent = "Gym";
    			option3 = element("option");
    			option3.textContent = "Home";
    			option4 = element("option");
    			option4.textContent = "Both";
    			t43 = space();
    			label14 = element("label");
    			t44 = text("What equipment do you have access to?\n            ");
    			select5 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t45 = space();
    			label15 = element("label");
    			t46 = text("Exercises to Avoid:\n            ");
    			select6 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t47 = space();
    			label16 = element("label");
    			t48 = text("Workout Frequency (days per week): ");
    			input11 = element("input");
    			t49 = space();
    			label17 = element("label");
    			t50 = text("Days You Can't Train:\n            ");
    			select7 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t51 = space();
    			button = element("button");
    			button.textContent = "Save";
    			attr(h30, "class", "svelte-lobtbm");
    			attr(input0, "placeholder", "Enter your name");
    			attr(input0, "class", "svelte-lobtbm");
    			attr(label0, "class", "svelte-lobtbm");
    			attr(input1, "type", "number");
    			attr(input1, "min", "0");
    			attr(input1, "placeholder", "Enter your age");
    			attr(input1, "class", "svelte-lobtbm");
    			attr(label1, "class", "svelte-lobtbm");
    			attr(input2, "type", "number");
    			attr(input2, "min", "0");
    			attr(input2, "placeholder", "Enter your height");
    			attr(input2, "class", "svelte-lobtbm");
    			attr(select0, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].height_unit === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[13].call(select0));
    			attr(label2, "class", "svelte-lobtbm");
    			attr(input3, "type", "number");
    			attr(input3, "min", "0");
    			attr(input3, "placeholder", "Enter your weight");
    			attr(input3, "class", "svelte-lobtbm");
    			attr(select1, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].weight_unit === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[15].call(select1));
    			attr(label3, "class", "svelte-lobtbm");
    			option0.__value = "";
    			option0.value = option0.__value;
    			attr(select2, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].gender === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[16].call(select2));
    			attr(label4, "class", "svelte-lobtbm");
    			attr(h31, "class", "svelte-lobtbm");
    			attr(input4, "type", "number");
    			attr(input4, "min", "0");
    			attr(input4, "placeholder", "Enter years trained");
    			attr(input4, "class", "svelte-lobtbm");
    			attr(label5, "class", "svelte-lobtbm");
    			attr(input5, "placeholder", "Enter your fitness level");
    			attr(input5, "class", "svelte-lobtbm");
    			attr(label6, "class", "svelte-lobtbm");
    			attr(input6, "placeholder", "Enter any injuries or health concerns");
    			attr(input6, "class", "svelte-lobtbm");
    			attr(label7, "class", "svelte-lobtbm");
    			attr(input7, "placeholder", "Enter your fitness goal");
    			attr(input7, "class", "svelte-lobtbm");
    			attr(label8, "class", "svelte-lobtbm");
    			attr(input8, "placeholder", "Enter your target timeframe");
    			attr(input8, "class", "svelte-lobtbm");
    			attr(label9, "class", "svelte-lobtbm");
    			attr(input9, "placeholder", "Enter any specific challenges");
    			attr(input9, "class", "svelte-lobtbm");
    			attr(label10, "class", "svelte-lobtbm");
    			attr(h32, "class", "svelte-lobtbm");
    			select3.multiple = true;
    			attr(select3, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].favorite_exercises === void 0) add_render_callback(() => /*select3_change_handler*/ ctx[23].call(select3));
    			attr(label11, "class", "svelte-lobtbm");
    			attr(input10, "type", "number");
    			attr(input10, "min", "0");
    			attr(input10, "placeholder", "Enter preferred workout duration");
    			attr(input10, "class", "svelte-lobtbm");
    			attr(label12, "class", "svelte-lobtbm");
    			option1.__value = "";
    			option1.value = option1.__value;
    			option2.__value = "gym";
    			option2.value = option2.__value;
    			option3.__value = "home";
    			option3.value = option3.__value;
    			option4.__value = "both";
    			option4.value = option4.__value;
    			attr(select4, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].gym_or_home === void 0) add_render_callback(() => /*select4_change_handler*/ ctx[25].call(select4));
    			attr(label13, "class", "svelte-lobtbm");
    			select5.multiple = true;
    			attr(select5, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].equipment === void 0) add_render_callback(() => /*select5_change_handler*/ ctx[26].call(select5));
    			attr(label14, "class", "svelte-lobtbm");
    			select6.multiple = true;
    			attr(select6, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].exercise_blacklist === void 0) add_render_callback(() => /*select6_change_handler*/ ctx[27].call(select6));
    			attr(label15, "class", "svelte-lobtbm");
    			attr(input11, "type", "number");
    			attr(input11, "min", "0");
    			attr(input11, "placeholder", "Enter workout frequency");
    			attr(input11, "class", "svelte-lobtbm");
    			attr(label16, "class", "svelte-lobtbm");
    			select7.multiple = true;
    			attr(select7, "class", "svelte-lobtbm");
    			if (/*user*/ ctx[0].days_cant_train === void 0) add_render_callback(() => /*select7_change_handler*/ ctx[29].call(select7));
    			attr(label17, "class", "svelte-lobtbm");
    			attr(button, "type", "submit");
    			attr(button, "class", "svelte-lobtbm");
    			attr(form, "class", "svelte-lobtbm");
    		},
    		m(target, anchor) {
    			insert(target, h2, anchor);
    			insert(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t2, anchor);
    			insert(target, form, anchor);
    			append(form, h30);
    			append(form, t4);
    			append(form, label0);
    			append(label0, t5);
    			append(label0, input0);
    			set_input_value(input0, /*user*/ ctx[0].name);
    			append(form, t6);
    			append(form, label1);
    			append(label1, t7);
    			append(label1, input1);
    			set_input_value(input1, /*user*/ ctx[0].age);
    			append(form, t8);
    			append(form, label2);
    			append(label2, t9);
    			append(label2, input2);
    			set_input_value(input2, /*user*/ ctx[0].height);
    			append(label2, t10);
    			append(label2, select0);

    			for (let i = 0; i < each_blocks_6.length; i += 1) {
    				if (each_blocks_6[i]) {
    					each_blocks_6[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*user*/ ctx[0].height_unit, true);
    			append(form, t11);
    			append(form, label3);
    			append(label3, t12);
    			append(label3, input3);
    			set_input_value(input3, /*user*/ ctx[0].weight);
    			append(label3, t13);
    			append(label3, select1);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				if (each_blocks_5[i]) {
    					each_blocks_5[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*user*/ ctx[0].weight_unit, true);
    			append(form, t14);
    			append(form, label4);
    			append(label4, t15);
    			append(label4, select2);
    			append(select2, option0);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				if (each_blocks_4[i]) {
    					each_blocks_4[i].m(select2, null);
    				}
    			}

    			select_option(select2, /*user*/ ctx[0].gender, true);
    			append(form, t17);
    			append(form, h31);
    			append(form, t19);
    			append(form, label5);
    			append(label5, t20);
    			append(label5, input4);
    			set_input_value(input4, /*user*/ ctx[0].years_trained);
    			append(form, t21);
    			append(form, label6);
    			append(label6, t22);
    			append(label6, input5);
    			set_input_value(input5, /*user*/ ctx[0].fitness_level);
    			append(form, t23);
    			append(form, label7);
    			append(label7, t24);
    			append(label7, input6);
    			set_input_value(input6, /*user*/ ctx[0].injuries);
    			append(form, t25);
    			append(form, label8);
    			append(label8, t26);
    			append(label8, input7);
    			set_input_value(input7, /*user*/ ctx[0].fitness_goal);
    			append(form, t27);
    			append(form, label9);
    			append(label9, t28);
    			append(label9, input8);
    			set_input_value(input8, /*user*/ ctx[0].target_timeframe);
    			append(form, t29);
    			append(form, label10);
    			append(label10, t30);
    			append(label10, input9);
    			set_input_value(input9, /*user*/ ctx[0].challenges);
    			append(form, t31);
    			append(form, h32);
    			append(form, t33);
    			append(form, label11);
    			append(label11, t34);
    			append(label11, select3);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(select3, null);
    				}
    			}

    			select_options(select3, /*user*/ ctx[0].favorite_exercises);
    			append(form, t35);
    			append(form, label12);
    			append(label12, t36);
    			append(label12, input10);
    			set_input_value(input10, /*user*/ ctx[0].preferred_workout_duration);
    			append(form, t37);
    			append(form, label13);
    			append(label13, t38);
    			append(label13, select4);
    			append(select4, option1);
    			append(select4, option2);
    			append(select4, option3);
    			append(select4, option4);
    			select_option(select4, /*user*/ ctx[0].gym_or_home, true);
    			append(form, t43);
    			append(form, label14);
    			append(label14, t44);
    			append(label14, select5);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select5, null);
    				}
    			}

    			select_options(select5, /*user*/ ctx[0].equipment);
    			append(form, t45);
    			append(form, label15);
    			append(label15, t46);
    			append(label15, select6);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select6, null);
    				}
    			}

    			select_options(select6, /*user*/ ctx[0].exercise_blacklist);
    			append(form, t47);
    			append(form, label16);
    			append(label16, t48);
    			append(label16, input11);
    			set_input_value(input11, /*user*/ ctx[0].frequency);
    			append(form, t49);
    			append(form, label17);
    			append(label17, t50);
    			append(label17, select7);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select7, null);
    				}
    			}

    			select_options(select7, /*user*/ ctx[0].days_cant_train);
    			append(form, t51);
    			append(form, button);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[10]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[11]),
    					listen(input2, "input", /*input2_input_handler*/ ctx[12]),
    					listen(select0, "change", /*select0_change_handler*/ ctx[13]),
    					listen(input3, "input", /*input3_input_handler*/ ctx[14]),
    					listen(select1, "change", /*select1_change_handler*/ ctx[15]),
    					listen(select2, "change", /*select2_change_handler*/ ctx[16]),
    					listen(input4, "input", /*input4_input_handler*/ ctx[17]),
    					listen(input5, "input", /*input5_input_handler*/ ctx[18]),
    					listen(input6, "input", /*input6_input_handler*/ ctx[19]),
    					listen(input7, "input", /*input7_input_handler*/ ctx[20]),
    					listen(input8, "input", /*input8_input_handler*/ ctx[21]),
    					listen(input9, "input", /*input9_input_handler*/ ctx[22]),
    					listen(select3, "change", /*select3_change_handler*/ ctx[23]),
    					listen(input10, "input", /*input10_input_handler*/ ctx[24]),
    					listen(select4, "change", /*select4_change_handler*/ ctx[25]),
    					listen(select5, "change", /*select5_change_handler*/ ctx[26]),
    					listen(select6, "change", /*select6_change_handler*/ ctx[27]),
    					listen(input11, "input", /*input11_input_handler*/ ctx[28]),
    					listen(select7, "change", /*select7_change_handler*/ ctx[29]),
    					listen(form, "submit", prevent_default(/*saveProfile*/ ctx[9]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (/*profileExists*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					if_block.m(t2.parentNode, t2);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && input0.value !== /*user*/ ctx[0].name) {
    				set_input_value(input0, /*user*/ ctx[0].name);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && to_number(input1.value) !== /*user*/ ctx[0].age) {
    				set_input_value(input1, /*user*/ ctx[0].age);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && to_number(input2.value) !== /*user*/ ctx[0].height) {
    				set_input_value(input2, /*user*/ ctx[0].height);
    			}

    			if (dirty[0] & /*heightUnits*/ 128) {
    				each_value_6 = /*heightUnits*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks_6[i]) {
    						each_blocks_6[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_6[i] = create_each_block_6(child_ctx);
    						each_blocks_6[i].c();
    						each_blocks_6[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_6.length; i += 1) {
    					each_blocks_6[i].d(1);
    				}

    				each_blocks_6.length = each_value_6.length;
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_option(select0, /*user*/ ctx[0].height_unit);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && to_number(input3.value) !== /*user*/ ctx[0].weight) {
    				set_input_value(input3, /*user*/ ctx[0].weight);
    			}

    			if (dirty[0] & /*weightUnits*/ 256) {
    				each_value_5 = /*weightUnits*/ ctx[8];
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_5[i]) {
    						each_blocks_5[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_5[i] = create_each_block_5(child_ctx);
    						each_blocks_5[i].c();
    						each_blocks_5[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_5.length; i += 1) {
    					each_blocks_5[i].d(1);
    				}

    				each_blocks_5.length = each_value_5.length;
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_option(select1, /*user*/ ctx[0].weight_unit);
    			}

    			if (dirty[0] & /*genderOptions*/ 64) {
    				each_value_4 = /*genderOptions*/ ctx[6];
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_4.length;
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_option(select2, /*user*/ ctx[0].gender);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && to_number(input4.value) !== /*user*/ ctx[0].years_trained) {
    				set_input_value(input4, /*user*/ ctx[0].years_trained);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && input5.value !== /*user*/ ctx[0].fitness_level) {
    				set_input_value(input5, /*user*/ ctx[0].fitness_level);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && input6.value !== /*user*/ ctx[0].injuries) {
    				set_input_value(input6, /*user*/ ctx[0].injuries);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && input7.value !== /*user*/ ctx[0].fitness_goal) {
    				set_input_value(input7, /*user*/ ctx[0].fitness_goal);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && input8.value !== /*user*/ ctx[0].target_timeframe) {
    				set_input_value(input8, /*user*/ ctx[0].target_timeframe);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && input9.value !== /*user*/ ctx[0].challenges) {
    				set_input_value(input9, /*user*/ ctx[0].challenges);
    			}

    			if (dirty[0] & /*exercises*/ 32) {
    				each_value_3 = /*exercises*/ ctx[5];
    				each_blocks_3 = update_keyed_each(each_blocks_3, dirty, get_key, 1, ctx, each_value_3, each3_lookup, select3, destroy_block, create_each_block_3, null, get_each_context_3);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_options(select3, /*user*/ ctx[0].favorite_exercises);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && to_number(input10.value) !== /*user*/ ctx[0].preferred_workout_duration) {
    				set_input_value(input10, /*user*/ ctx[0].preferred_workout_duration);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_option(select4, /*user*/ ctx[0].gym_or_home);
    			}

    			if (dirty[0] & /*equipmentOptions*/ 8) {
    				each_value_2 = /*equipmentOptions*/ ctx[3];
    				each_blocks_2 = update_keyed_each(each_blocks_2, dirty, get_key_1, 1, ctx, each_value_2, each4_lookup, select5, destroy_block, create_each_block_2, null, get_each_context_2);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_options(select5, /*user*/ ctx[0].equipment);
    			}

    			if (dirty[0] & /*exercises*/ 32) {
    				each_value_1 = /*exercises*/ ctx[5];
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key_2, 1, ctx, each_value_1, each5_lookup, select6, destroy_block, create_each_block_1, null, get_each_context_1);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_options(select6, /*user*/ ctx[0].exercise_blacklist);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129 && to_number(input11.value) !== /*user*/ ctx[0].frequency) {
    				set_input_value(input11, /*user*/ ctx[0].frequency);
    			}

    			if (dirty[0] & /*daysOfWeek*/ 16) {
    				each_value = /*daysOfWeek*/ ctx[4];
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_3, 1, ctx, each_value, each6_lookup, select7, destroy_block, create_each_block$1, null, get_each_context$1);
    			}

    			if (dirty[0] & /*user, heightUnits*/ 129) {
    				select_options(select7, /*user*/ ctx[0].days_cant_train);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(h2);
    			if (detaching) detach(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t2);
    			if (detaching) detach(form);
    			destroy_each(each_blocks_6, detaching);
    			destroy_each(each_blocks_5, detaching);
    			destroy_each(each_blocks_4, detaching);

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

    // (141:4) {#if profileExists}
    function create_if_block_1$2(ctx) {
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

    // (142:8) {#if dataSaved}
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

    // (154:16) {#each heightUnits as unit}
    function create_each_block_6(ctx) {
    	let option;
    	let t_value = /*unit*/ ctx[47] + "";
    	let t;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*unit*/ ctx[47];
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (163:16) {#each weightUnits as unit}
    function create_each_block_5(ctx) {
    	let option;
    	let t_value = /*unit*/ ctx[47] + "";
    	let t;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*unit*/ ctx[47];
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (171:16) {#each genderOptions as gender}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*gender*/ ctx[44] + "";
    	let t;

    	return {
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*gender*/ ctx[44];
    			option.value = option.__value;
    		},
    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t);
    		},
    		p: noop,
    		d(detaching) {
    			if (detaching) detach(option);
    		}
    	};
    }

    // (187:16) {#each exercises as exercise (exercise)}
    function create_each_block_3(key_1, ctx) {
    	let option;
    	let t_value = /*exercise*/ ctx[36] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*exercise*/ ctx[36];
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

    // (203:16) {#each equipmentOptions as equipment (equipment)}
    function create_each_block_2(key_1, ctx) {
    	let option;
    	let t_value = /*equipment*/ ctx[39] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*equipment*/ ctx[39];
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

    // (210:16) {#each exercises as exercise (exercise)}
    function create_each_block_1(key_1, ctx) {
    	let option;
    	let t_value = /*exercise*/ ctx[36] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*exercise*/ ctx[36];
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

    // (218:16) {#each daysOfWeek as day (day)}
    function create_each_block$1(key_1, ctx) {
    	let option;
    	let t_value = /*day*/ ctx[33] + "";
    	let t;

    	return {
    		key: key_1,
    		first: null,
    		c() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*day*/ ctx[33];
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
    	const fetchAuthStatus = async () => {
    		try {
    			const response = await fetch("./api/auth"); // Updated to the get_me endpoint

    			if (response.ok) {
    				const user = await response.json();
    				isAuth = true; // The user is authenticated if the request was successful
    				email = user.email;
    			} else {
    				isAuth = false;
    				email = "";
    			}
    		} catch(error) {
    			console.error("Error fetching authentication status:", error);
    			isAuth = false;
    			username = "";
    		}
    	};

    	let email;

    	let user = {
    		name: '',
    		age: '',
    		height_unit: 'ft',
    		height: '',
    		weight_unit: 'lbs',
    		weight: '',
    		gender: '',
    		years_trained: '',
    		type: '',
    		fitness_level: '',
    		injuries: '',
    		fitness_goal: '',
    		target_timeframe: '',
    		challenges: '',
    		favorite_exercises: [],
    		exercise_blacklist: [],
    		frequency: '',
    		days_cant_train: [],
    		preferred_workout_duration: '',
    		gym_or_home: '',
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

    	const genderOptions = ['Male', 'Female', 'Other'];
    	const heightUnits = ['cm', 'ft'];
    	const weightUnits = ['kg', 'lbs'];

    	onMount(async () => {
    		await fetchAuthStatus();

    		const response = await fetch(`./api/profile/${email}`, {
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
    		const response = await fetch(`./api/profile/${email}`, {
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
    		$$invalidate(7, heightUnits);
    	}

    	function input1_input_handler() {
    		user.age = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input2_input_handler() {
    		user.height = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select0_change_handler() {
    		user.height_unit = select_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input3_input_handler() {
    		user.weight = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select1_change_handler() {
    		user.weight_unit = select_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select2_change_handler() {
    		user.gender = select_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input4_input_handler() {
    		user.years_trained = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input5_input_handler() {
    		user.fitness_level = this.value;
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input6_input_handler() {
    		user.injuries = this.value;
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input7_input_handler() {
    		user.fitness_goal = this.value;
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input8_input_handler() {
    		user.target_timeframe = this.value;
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input9_input_handler() {
    		user.challenges = this.value;
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select3_change_handler() {
    		user.favorite_exercises = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input10_input_handler() {
    		user.preferred_workout_duration = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select4_change_handler() {
    		user.gym_or_home = select_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select5_change_handler() {
    		user.equipment = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select6_change_handler() {
    		user.exercise_blacklist = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function input11_input_handler() {
    		user.frequency = to_number(this.value);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	function select7_change_handler() {
    		user.days_cant_train = select_multiple_value(this);
    		$$invalidate(0, user);
    		$$invalidate(7, heightUnits);
    	}

    	return [
    		user,
    		profileExists,
    		dataSaved,
    		equipmentOptions,
    		daysOfWeek,
    		exercises,
    		genderOptions,
    		heightUnits,
    		weightUnits,
    		saveProfile,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		select0_change_handler,
    		input3_input_handler,
    		select1_change_handler,
    		select2_change_handler,
    		input4_input_handler,
    		input5_input_handler,
    		input6_input_handler,
    		input7_input_handler,
    		input8_input_handler,
    		input9_input_handler,
    		select3_change_handler,
    		input10_input_handler,
    		select4_change_handler,
    		select5_change_handler,
    		select6_change_handler,
    		input11_input_handler,
    		select7_change_handler
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
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (72:4) {#each responses as response (response.id)}
    function create_each_block(key_1, ctx) {
    	let div;
    	let h2;
    	let t0_value = /*response*/ ctx[3].prompt + "";
    	let t0;
    	let t1;
    	let pre;
    	let t2_value = /*response*/ ctx[3].response + "";
    	let t2;
    	let t3;
    	let button;
    	let t5;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[2](/*response*/ ctx[3]);
    	}

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
    			button = element("button");
    			button.textContent = "Delete";
    			t5 = space();
    			attr(pre, "class", "svelte-4oa9pc");
    			attr(button, "class", "delete-button svelte-4oa9pc");
    			attr(div, "class", "response-item svelte-4oa9pc");
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
    			append(div, button);
    			append(div, t5);

    			if (!mounted) {
    				dispose = listen(button, "click", click_handler);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*responses*/ 1 && t0_value !== (t0_value = /*response*/ ctx[3].prompt + "")) set_data(t0, t0_value);
    			if (dirty & /*responses*/ 1 && t2_value !== (t2_value = /*response*/ ctx[3].response + "")) set_data(t2, t2_value);
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
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
    	const get_key = ctx => /*response*/ ctx[3].id;

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

    			attr(div, "class", "container svelte-4oa9pc");
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
    			if (dirty & /*deleteResponse, responses*/ 3) {
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

    	async function deleteResponse(id) {
    		const res = await fetch(`/response/${id}`, {
    			method: 'DELETE',
    			headers: {
    				'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    			}
    		});

    		if (res.ok) {
    			$$invalidate(0, responses = responses.filter(response => response.id !== id));
    		} else {
    			console.error('Error deleting response:', await res.json());
    		}
    	}

    	onMount(async () => {
    		const res = await fetch('/responses', {
    			headers: {
    				'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
    			}
    		});

    		$$invalidate(0, responses = await res.json());
    	});

    	const click_handler = response => deleteResponse(response.id);
    	return [responses, deleteResponse, click_handler];
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

    // (141:22) 
    function create_if_block_1$1(ctx) {
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

    // (139:2) {#if error}
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

    // (146:4) {:else}
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

    // (144:4) {#if $user}
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
    		if (/*isLoading*/ ctx[1]) return create_if_block_1$1;
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
    			return `My name is ${$user.name} and I am ${$user.age} years old. I am ${$user.height} ${$user.height_unit} tall and I weigh ${$user.weight} ${$user.weight_unit}. I am ${$user.gender} and I have been training for ${$user.years_trained} years. 
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
    			console.log(generatedText);
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

    function create_if_block_1(ctx) {
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

    // (69:4) {#if loggedIn}
    function create_if_block$1(ctx) {
    	let p;
    	let t;

    	return {
    		c() {
    			p = element("p");
    			t = text(/*successMessage*/ ctx[5]);
    			set_style(p, "color", "green");
    		},
    		m(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*successMessage*/ 32) set_data(t, /*successMessage*/ ctx[5]);
    		},
    		d(detaching) {
    			if (detaching) detach(p);
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
    	let t4;
    	let mounted;
    	let dispose;
    	let if_block0 = /*attemptedLogin*/ ctx[3] && !/*loggedIn*/ ctx[2] && create_if_block_1(ctx);
    	let if_block1 = /*loggedIn*/ ctx[2] && create_if_block$1(ctx);

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
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			attr(input0, "type", "email");
    			attr(input0, "placeholder", "Email");
    			attr(input0, "class", "svelte-14pci5v");
    			attr(input1, "type", "password");
    			attr(input1, "placeholder", "Password");
    			attr(input1, "class", "svelte-14pci5v");
    			attr(button, "type", "submit");
    			attr(button, "class", "svelte-14pci5v");
    			attr(form, "class", "svelte-14pci5v");
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
    			if (if_block0) if_block0.m(form, null);
    			append(form, t4);
    			if (if_block1) if_block1.m(form, null);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[7]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[8]),
    					listen(form, "submit", prevent_default(/*login*/ ctx[6]))
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
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(form, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*loggedIn*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(form, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(form);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    async function getCsrfToken() {
    	const response = await fetch("./api/csrf_token", { method: "GET" });
    	console.log(response);

    	if (response.ok) {
    		const data = await response.json();
    		console.log("Got back CsrfToken:", data.csrfToken);
    		return data.csrfToken;
    	} else {
    		alert("Failed to fetch CSRF token.");
    		return null;
    	}
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let email = "";
    	let password = "";
    	let loggedIn = false;
    	let attemptedLogin = false;
    	let errorMessage = "";
    	let successMessage = "";

    	async function login() {
    		$$invalidate(4, errorMessage = "");
    		$$invalidate(5, successMessage = "");
    		const csrfToken = await getCsrfToken();

    		const response = await fetch("./api/auth", {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify({ email, password, csrfToken }),
    			credentials: "include"
    		});

    		console.log(response);
    		console.log(await response.text());
    		$$invalidate(3, attemptedLogin = true);

    		if (response.ok) {
    			//const data = await response.json();
    			//console.log(data);
    			auth.set({ isAuth: true, username: email });

    			$$invalidate(2, loggedIn = true);
    			$$invalidate(5, successMessage = "Logged in successfully!");
    			localStorage.setItem("auth_token", data.auth_token);
    		}

    		const data = await response.json();
    		console.log(data);
    		auth.set({ isAuth: true, username: email });
    		$$invalidate(2, loggedIn = true);
    		localStorage.setItem("auth_token", data.auth_token);
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
    		successMessage,
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
    	let div;
    	let h1;
    	let t1;
    	let p;
    	let t3;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "Register Account";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Please enter your email and new password";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			button = element("button");
    			button.textContent = "Register";
    			attr(input0, "class", "field");
    			attr(input0, "type", "text");
    			attr(input0, "placeholder", "email");
    			attr(input1, "class", "field");
    			attr(input1, "type", "password");
    			attr(input1, "placeholder", "Password");
    			attr(button, "class", "btn");
    			attr(div, "class", "login");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, h1);
    			append(div, t1);
    			append(div, p);
    			append(div, t3);
    			append(div, input0);
    			set_input_value(input0, /*username*/ ctx[0]);
    			append(div, t4);
    			append(div, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append(div, t5);
    			append(div, button);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen(input1, "input", /*input1_input_handler*/ ctx[4]),
    					listen(button, "click", prevent_default(/*register*/ ctx[2]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*username*/ 1 && input0.value !== /*username*/ ctx[0]) {
    				set_input_value(input0, /*username*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let username = "";
    	let password = "";

    	async function register() {
    		const response = await fetch("./api/register_user", {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify({ username, password })
    		});

    		console.log(response);
    		const data = await response.json();

    		if (response.ok) {
    			alert("Successfully registered!");
    			$$invalidate(1, password = "");
    		} else {
    			alert(`Failed to register. Reason: ${JSON.stringify(data)}`);
    		}
    	}

    	function input0_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	return [username, password, register, input0_input_handler, input1_input_handler];
    }

    class Register extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    function t(){}function e(t){return t()}function i(){return Object.create(null)}function o(t){t.forEach(e);}function s(t){return "function"==typeof t}function n(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function a(t){t.parentNode.removeChild(t);}function r(t,e,i){null==i?t.removeAttribute(e):t.getAttribute(e)!==i&&t.setAttribute(e,i);}let l;function c(t){l=t;}function d(){if(!l)throw new Error("Function called outside component initialization");return l}function h(){const t=d();return (e,i)=>{const o=t.$$.callbacks[e];if(o){const s=function(t,e){const i=document.createEvent("CustomEvent");return i.initCustomEvent(t,!1,!1,e),i}(e,i);o.slice().forEach((e=>{e.call(t,s);}));}}}const u=[],v=[],p=[],y=[],f=Promise.resolve();let m=!1;function g(t){p.push(t);}let b=!1;const w=new Set;function x(){if(!b){b=!0;do{for(let t=0;t<u.length;t+=1){const e=u[t];c(e),k(e.$$);}for(c(null),u.length=0;v.length;)v.pop()();for(let t=0;t<p.length;t+=1){const e=p[t];w.has(e)||(w.add(e),e());}p.length=0;}while(u.length);for(;y.length;)y.pop()();m=!1,b=!1,w.clear();}}function k(t){if(null!==t.fragment){t.update(),o(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(g);}}const P=new Set;function M(t,e){-1===t.$$.dirty[0]&&(u.push(t),m||(m=!0,f.then(x)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31;}function R(n,r,d,h,u,v,p=[-1]){const y=l;c(n);const f=n.$$={fragment:null,ctx:null,props:v,update:t,not_equal:u,bound:i(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(y?y.$$.context:[]),callbacks:i(),dirty:p,skip_bound:!1};let m=!1;if(f.ctx=d?d(n,r.props||{},((t,e,...i)=>{const o=i.length?i[0]:e;return f.ctx&&u(f.ctx[t],f.ctx[t]=o)&&(!f.skip_bound&&f.bound[t]&&f.bound[t](o),m&&M(n,t)),e})):[],f.update(),m=!0,o(f.before_update),f.fragment=!!h&&h(f.ctx),r.target){if(r.hydrate){const t=function(t){return Array.from(t.childNodes)}(r.target);f.fragment&&f.fragment.l(t),t.forEach(a);}else f.fragment&&f.fragment.c();r.intro&&((b=n.$$.fragment)&&b.i&&(P.delete(b),b.i(w))),function(t,i,n,a){const{fragment:r,on_mount:l,on_destroy:c,after_update:d}=t.$$;r&&r.m(i,n),a||g((()=>{const i=l.map(e).filter(s);c?c.push(...i):o(i),t.$$.on_mount=[];})),d.forEach(g);}(n,r.target,r.anchor,r.customElement),x();}var b,w;c(y);}class S{getSidesCount(){return 4}draw(t,e,i){t.rect(-i,-i,2*i,2*i);}}var C,z,A;!function(t){t.bottom="bottom",t.left="left",t.right="right",t.top="top";}(C||(C={})),function(t){t.bottom="bottom",t.bottomLeft="bottom-left",t.bottomRight="bottom-right",t.left="left",t.none="none",t.right="right",t.top="top",t.topLeft="top-left",t.topRight="top-right";}(z||(z={})),function(t){t.clockwise="clockwise",t.counterClockwise="counter-clockwise",t.random="random";}(A||(A={}));class T{constructor(t,e){let i,o;if(void 0===e){if("number"==typeof t)throw new Error("tsParticles - Vector not initialized correctly");const e=t;[i,o]=[e.x,e.y];}else [i,o]=[t,e];this.x=i,this.y=o;}static clone(t){return T.create(t.x,t.y)}static create(t,e){return new T(t,e)}get angle(){return Math.atan2(this.y,this.x)}set angle(t){this.updateFromAngle(t,this.length);}get length(){return Math.sqrt(Math.pow(this.x,2)+Math.pow(this.y,2))}set length(t){this.updateFromAngle(this.angle,t);}add(t){return T.create(this.x+t.x,this.y+t.y)}addTo(t){this.x+=t.x,this.y+=t.y;}sub(t){return T.create(this.x-t.x,this.y-t.y)}subFrom(t){this.x-=t.x,this.y-=t.y;}mult(t){return T.create(this.x*t,this.y*t)}multTo(t){this.x*=t,this.y*=t;}div(t){return T.create(this.x/t,this.y/t)}divTo(t){this.x/=t,this.y/=t;}distanceTo(t){return this.sub(t).length}getLengthSq(){return Math.pow(this.x,2)+Math.pow(this.y,2)}distanceToSq(t){return this.sub(t).getLengthSq()}manhattanDistanceTo(t){return Math.abs(t.x-this.x)+Math.abs(t.y-this.y)}copy(){return T.clone(this)}setTo(t){this.x=t.x,this.y=t.y;}rotate(t){return T.create(this.x*Math.cos(t)-this.y*Math.sin(t),this.x*Math.sin(t)+this.y*Math.cos(t))}updateFromAngle(t,e){this.x=Math.cos(t)*e,this.y=Math.sin(t)*e;}}T.origin=T.create(0,0);class E{static clamp(t,e,i){return Math.min(Math.max(t,e),i)}static mix(t,e,i,o){return Math.floor((t*i+e*o)/(i+o))}static randomInRange(t){const e=E.getRangeMax(t);let i=E.getRangeMin(t);return e===i&&(i=0),Math.random()*(e-i)+i}static getRangeValue(t){return "number"==typeof t?t:E.randomInRange(t)}static getRangeMin(t){return "number"==typeof t?t:t.min}static getRangeMax(t){return "number"==typeof t?t:t.max}static setRangeValue(t,e){if(t===e||void 0===e&&"number"==typeof t)return t;const i=E.getRangeMin(t),o=E.getRangeMax(t);return void 0!==e?{min:Math.min(i,e),max:Math.max(o,e)}:E.setRangeValue(i,o)}static getValue(t){const e=t.random,{enable:i,minimumValue:o}="boolean"==typeof e?{enable:e,minimumValue:0}:e;return i?E.getRangeValue(E.setRangeValue(t.value,o)):E.getRangeValue(t.value)}static getDistances(t,e){const i=t.x-e.x,o=t.y-e.y;return {dx:i,dy:o,distance:Math.sqrt(i*i+o*o)}}static getDistance(t,e){return E.getDistances(t,e).distance}static getParticleBaseVelocity(t){const e=T.origin;switch(e.length=1,t){case z.top:e.angle=-Math.PI/2;break;case z.topRight:e.angle=-Math.PI/4;break;case z.right:e.angle=0;break;case z.bottomRight:e.angle=Math.PI/4;break;case z.bottom:e.angle=Math.PI/2;break;case z.bottomLeft:e.angle=3*Math.PI/4;break;case z.left:e.angle=Math.PI;break;case z.topLeft:e.angle=-3*Math.PI/4;break;case z.none:default:e.angle=Math.random()*Math.PI*2;}return e}static rotateVelocity(t,e){return {horizontal:t.horizontal*Math.cos(e)-t.vertical*Math.sin(e),vertical:t.horizontal*Math.sin(e)+t.vertical*Math.cos(e)}}static collisionVelocity(t,e,i,o){return T.create(t.x*(i-o)/(i+o)+2*e.x*o/(i+o),t.y)}}var D,O,I,F,L,V,H,_,q,B,$,W,G,N,U,j=function(t,e,i,o){return new(i||(i=Promise))((function(s,n){function a(t){try{l(o.next(t));}catch(t){n(t);}}function r(t){try{l(o.throw(t));}catch(t){n(t);}}function l(t){var e;t.done?s(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(a,r);}l((o=o.apply(t,e||[])).next());}))};function Y(t,e,i,o,s,n){const a={bounced:!1};return e.min>=o.min&&e.min<=o.max&&e.max>=o.min&&e.max<=o.max&&(t.max>=i.min&&t.max<=(i.max+i.min)/2&&s>0||t.min<=i.max&&t.min>(i.max+i.min)/2&&s<0)&&(a.velocity=s*-n,a.bounced=!0),a}function X(t,e){if(e instanceof Array){for(const i of e)if(t.matches(i))return !0;return !1}return t.matches(e)}class J{static isSsr(){return "undefined"==typeof window||!window}static get animate(){return J.isSsr()?t=>setTimeout(t):t=>(window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||window.setTimeout)(t)}static get cancelAnimation(){return J.isSsr()?t=>clearTimeout(t):t=>(window.cancelAnimationFrame||window.webkitCancelRequestAnimationFrame||window.mozCancelRequestAnimationFrame||window.oCancelRequestAnimationFrame||window.msCancelRequestAnimationFrame||window.clearTimeout)(t)}static isInArray(t,e){return t===e||e instanceof Array&&e.indexOf(t)>-1}static loadFont(t){return j(this,void 0,void 0,(function*(){try{yield document.fonts.load(`${t.weight} 36px '${t.font}'`);}catch(t){}}))}static arrayRandomIndex(t){return Math.floor(Math.random()*t.length)}static itemFromArray(t,e,i=!0){return t[void 0!==e&&i?e%t.length:J.arrayRandomIndex(t)]}static isPointInside(t,e,i,o){return J.areBoundsInside(J.calculateBounds(t,null!=i?i:0),e,o)}static areBoundsInside(t,e,i){let o=!0;return i&&i!==C.bottom||(o=t.top<e.height),!o||i&&i!==C.left||(o=t.right>0),!o||i&&i!==C.right||(o=t.left<e.width),!o||i&&i!==C.top||(o=t.bottom>0),o}static calculateBounds(t,e){return {bottom:t.y+e,left:t.x-e,right:t.x+e,top:t.y-e}}static loadImage(t){return new Promise(((e,i)=>{if(!t)return void i("Error tsParticles - No image.src");const o={source:t,type:t.substr(t.length-3)},s=new Image;s.addEventListener("load",(()=>{o.element=s,e(o);})),s.addEventListener("error",(()=>{i(`Error tsParticles - loading image: ${t}`);})),s.src=t;}))}static downloadSvgImage(t){return j(this,void 0,void 0,(function*(){if(!t)throw new Error("Error tsParticles - No image.src");const e={source:t,type:t.substr(t.length-3)};if("svg"!==e.type)return J.loadImage(t);const i=yield fetch(e.source);if(!i.ok)throw new Error("Error tsParticles - Image not found");return e.svgData=yield i.text(),e}))}static deepExtend(t,...e){for(const i of e){if(null==i)continue;if("object"!=typeof i){t=i;continue}const e=Array.isArray(i);!e||"object"==typeof t&&t&&Array.isArray(t)?e||"object"==typeof t&&t&&!Array.isArray(t)||(t={}):t=[];for(const e in i){if("__proto__"===e)continue;const o=i[e],s="object"==typeof o,n=t;n[e]=s&&Array.isArray(o)?o.map((t=>J.deepExtend(n[e],t))):J.deepExtend(n[e],o);}}return t}static isDivModeEnabled(t,e){return e instanceof Array?!!e.find((e=>e.enable&&J.isInArray(t,e.mode))):J.isInArray(t,e.mode)}static divModeExecute(t,e,i){if(e instanceof Array)for(const o of e){const e=o.mode;o.enable&&J.isInArray(t,e)&&J.singleDivModeExecute(o,i);}else {const o=e.mode;e.enable&&J.isInArray(t,o)&&J.singleDivModeExecute(e,i);}}static singleDivModeExecute(t,e){const i=t.selectors;if(i instanceof Array)for(const o of i)e(o,t);else e(i,t);}static divMode(t,e){if(e&&t)return t instanceof Array?t.find((t=>X(e,t.selectors))):X(e,t.selectors)?t:void 0}static circleBounceDataFromParticle(t){return {position:t.getPosition(),radius:t.getRadius(),mass:t.getMass(),velocity:t.velocity,factor:{horizontal:E.getValue(t.options.bounce.horizontal),vertical:E.getValue(t.options.bounce.vertical)}}}static circleBounce(t,e){const i=t.velocity.x,o=t.velocity.y,s=t.position,n=e.position;if(i*(n.x-s.x)+o*(n.y-s.y)>=0){const i=-Math.atan2(n.y-s.y,n.x-s.x),o=t.mass,a=e.mass,r=t.velocity.rotate(i),l=e.velocity.rotate(i),c=E.collisionVelocity(r,l,o,a),d=E.collisionVelocity(l,r,o,a),h=c.rotate(-i),u=d.rotate(-i);t.velocity.x=h.x*t.factor.horizontal,t.velocity.y=h.y*t.factor.vertical,e.velocity.x=u.x*e.factor.horizontal,e.velocity.y=u.y*e.factor.vertical;}}static rectBounce(t,e){const i=t.getPosition(),o=t.getRadius(),s=J.calculateBounds(i,o),n=Y({min:s.left,max:s.right},{min:s.top,max:s.bottom},{min:e.left,max:e.right},{min:e.top,max:e.bottom},t.velocity.x,E.getValue(t.options.bounce.horizontal));n.bounced&&void 0!==n.velocity&&(t.velocity.x=n.velocity);const a=Y({min:s.top,max:s.bottom},{min:s.left,max:s.right},{min:e.top,max:e.bottom},{min:e.left,max:e.right},t.velocity.y,E.getValue(t.options.bounce.vertical));a.bounced&&void 0!==a.velocity&&(t.velocity.y=a.velocity);}}class Q{}function Z(t,e,i){let o=i;return o<0&&(o+=1),o>1&&(o-=1),o<1/6?t+6*(e-t)*o:o<.5?e:o<2/3?t+(e-t)*(2/3-o)*6:t}function K(t){if(t.startsWith("rgb")){const e=/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([\d.]+)\s*)?\)/i.exec(t);return e?{a:e.length>4?parseFloat(e[5]):1,b:parseInt(e[3],10),g:parseInt(e[2],10),r:parseInt(e[1],10)}:void 0}if(t.startsWith("hsl")){const e=/hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([\d.]+)\s*)?\)/i.exec(t);return e?tt.hslaToRgba({a:e.length>4?parseFloat(e[5]):1,h:parseInt(e[1],10),l:parseInt(e[3],10),s:parseInt(e[2],10)}):void 0}if(t.startsWith("hsv")){const e=/hsva?\(\s*(\d+)°\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(,\s*([\d.]+)\s*)?\)/i.exec(t);return e?tt.hsvaToRgba({a:e.length>4?parseFloat(e[5]):1,h:parseInt(e[1],10),s:parseInt(e[2],10),v:parseInt(e[3],10)}):void 0}{const e=/^#?([a-f\d])([a-f\d])([a-f\d])([a-f\d])?$/i,i=t.replace(e,((t,e,i,o,s)=>e+e+i+i+o+o+(void 0!==s?s+s:""))),o=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i.exec(i);return o?{a:void 0!==o[4]?parseInt(o[4],16)/255:1,b:parseInt(o[3],16),g:parseInt(o[2],16),r:parseInt(o[1],16)}:void 0}}Q.canvasClass="tsparticles-canvas-el",Q.randomColorValue="random",Q.midColorValue="mid",Q.touchEndEvent="touchend",Q.mouseDownEvent="mousedown",Q.mouseUpEvent="mouseup",Q.mouseMoveEvent="mousemove",Q.touchStartEvent="touchstart",Q.touchMoveEvent="touchmove",Q.mouseLeaveEvent="mouseleave",Q.mouseOutEvent="mouseout",Q.touchCancelEvent="touchcancel",Q.resizeEvent="resize",Q.visibilityChangeEvent="visibilitychange",Q.noPolygonDataLoaded="No polygon data loaded.",Q.noPolygonFound="No polygon found, you need to specify SVG url in config.";class tt{static colorToRgb(t,e,i=!0){var o,s,n;if(void 0===t)return;const a="string"==typeof t?{value:t}:t;let r;if("string"==typeof a.value)r=a.value===Q.randomColorValue?tt.getRandomRgbColor():tt.stringToRgb(a.value);else if(a.value instanceof Array){const t=J.itemFromArray(a.value,e,i);r=tt.colorToRgb({value:t});}else {const t=a.value,e=null!==(o=t.rgb)&&void 0!==o?o:a.value;if(void 0!==e.r)r=e;else {const e=null!==(s=t.hsl)&&void 0!==s?s:a.value;if(void 0!==e.h&&void 0!==e.l)r=tt.hslToRgb(e);else {const e=null!==(n=t.hsv)&&void 0!==n?n:a.value;void 0!==e.h&&void 0!==e.v&&(r=tt.hsvToRgb(e));}}}return r}static colorToHsl(t,e,i=!0){const o=tt.colorToRgb(t,e,i);return void 0!==o?tt.rgbToHsl(o):void 0}static rgbToHsl(t){const e=t.r/255,i=t.g/255,o=t.b/255,s=Math.max(e,i,o),n=Math.min(e,i,o),a={h:0,l:(s+n)/2,s:0};return s!=n&&(a.s=a.l<.5?(s-n)/(s+n):(s-n)/(2-s-n),a.h=e===s?(i-o)/(s-n):a.h=i===s?2+(o-e)/(s-n):4+(e-i)/(s-n)),a.l*=100,a.s*=100,a.h*=60,a.h<0&&(a.h+=360),a}static stringToAlpha(t){var e;return null===(e=K(t))||void 0===e?void 0:e.a}static stringToRgb(t){return K(t)}static hslToRgb(t){const e={b:0,g:0,r:0},i={h:t.h/360,l:t.l/100,s:t.s/100};if(0===i.s)e.b=i.l,e.g=i.l,e.r=i.l;else {const t=i.l<.5?i.l*(1+i.s):i.l+i.s-i.l*i.s,o=2*i.l-t;e.r=Z(o,t,i.h+1/3),e.g=Z(o,t,i.h),e.b=Z(o,t,i.h-1/3);}return e.r=Math.floor(255*e.r),e.g=Math.floor(255*e.g),e.b=Math.floor(255*e.b),e}static hslaToRgba(t){const e=tt.hslToRgb(t);return {a:t.a,b:e.b,g:e.g,r:e.r}}static hslToHsv(t){const e=t.l/100,i=e+t.s/100*Math.min(e,1-e),o=i?2*(1-e/i):0;return {h:t.h,s:100*o,v:100*i}}static hslaToHsva(t){const e=tt.hslToHsv(t);return {a:t.a,h:e.h,s:e.s,v:e.v}}static hsvToHsl(t){const e=t.v/100,i=e*(1-t.s/100/2),o=0===i||1===i?0:(e-i)/Math.min(i,1-i);return {h:t.h,l:100*i,s:100*o}}static hsvaToHsla(t){const e=tt.hsvToHsl(t);return {a:t.a,h:e.h,l:e.l,s:e.s}}static hsvToRgb(t){const e={b:0,g:0,r:0},i=t.h/60,o=t.s/100,s=t.v/100,n=s*o,a=n*(1-Math.abs(i%2-1));let r;if(i>=0&&i<=1?r={r:n,g:a,b:0}:i>1&&i<=2?r={r:a,g:n,b:0}:i>2&&i<=3?r={r:0,g:n,b:a}:i>3&&i<=4?r={r:0,g:a,b:n}:i>4&&i<=5?r={r:a,g:0,b:n}:i>5&&i<=6&&(r={r:n,g:0,b:a}),r){const t=s-n;e.r=Math.floor(255*(r.r+t)),e.g=Math.floor(255*(r.g+t)),e.b=Math.floor(255*(r.b+t));}return e}static hsvaToRgba(t){const e=tt.hsvToRgb(t);return {a:t.a,b:e.b,g:e.g,r:e.r}}static rgbToHsv(t){const e={r:t.r/255,g:t.g/255,b:t.b/255},i=Math.max(e.r,e.g,e.b),o=i-Math.min(e.r,e.g,e.b);let s=0;i===e.r?s=(e.g-e.b)/o*60:i===e.g?s=60*(2+(e.b-e.r)/o):i===e.b&&(s=60*(4+(e.r-e.g)/o));return {h:s,s:100*(i?o/i:0),v:100*i}}static rgbaToHsva(t){const e=tt.rgbToHsv(t);return {a:t.a,h:e.h,s:e.s,v:e.v}}static getRandomRgbColor(t){const e=null!=t?t:0;return {b:Math.floor(E.randomInRange(E.setRangeValue(e,256))),g:Math.floor(E.randomInRange(E.setRangeValue(e,256))),r:Math.floor(E.randomInRange(E.setRangeValue(e,256)))}}static getStyleFromRgb(t,e){return `rgba(${t.r}, ${t.g}, ${t.b}, ${null!=e?e:1})`}static getStyleFromHsl(t,e){return `hsla(${t.h}, ${t.s}%, ${t.l}%, ${null!=e?e:1})`}static getStyleFromHsv(t,e){return tt.getStyleFromHsl(tt.hsvToHsl(t),e)}static mix(t,e,i,o){let s=t,n=e;return void 0===s.r&&(s=tt.hslToRgb(t)),void 0===n.r&&(n=tt.hslToRgb(e)),{b:E.mix(s.b,n.b,i,o),g:E.mix(s.g,n.g,i,o),r:E.mix(s.r,n.r,i,o)}}static replaceColorSvg(t,e,i){if(!t.svgData)return "";return t.svgData.replace(/#([0-9A-F]{3,6})/gi,(()=>tt.getStyleFromHsl(e,i)))}static getLinkColor(t,e,i){var o,s;if(i===Q.randomColorValue)return tt.getRandomRgbColor();if("mid"!==i)return i;{const i=null!==(o=t.getFillColor())&&void 0!==o?o:t.getStrokeColor(),n=null!==(s=null==e?void 0:e.getFillColor())&&void 0!==s?s:null==e?void 0:e.getStrokeColor();if(i&&n&&e)return tt.mix(i,n,t.getRadius(),e.getRadius());{const t=null!=i?i:n;if(t)return tt.hslToRgb(t)}}}static getLinkRandomColor(t,e,i){const o="string"==typeof t?t:t.value;return o===Q.randomColorValue?i?tt.colorToRgb({value:o}):e?Q.randomColorValue:Q.midColorValue:tt.colorToRgb({value:o})}static getHslFromAnimation(t){return void 0!==t?{h:t.h.value,s:t.s.value,l:t.l.value}:void 0}}function et(t,e,i){t.beginPath(),t.moveTo(e.x,e.y),t.lineTo(i.x,i.y),t.closePath();}class it{static paintBase(t,e,i){t.save(),t.fillStyle=null!=i?i:"rgba(0,0,0,0)",t.fillRect(0,0,e.width,e.height),t.restore();}static clear(t,e){t.clearRect(0,0,e.width,e.height);}static drawLinkLine(t,e,i,o,s,n,a,r,l,c,d,h){let u=!1;if(E.getDistance(i,o)<=s)et(t,i,o),u=!0;else if(a){let e,a;const r={x:o.x-n.width,y:o.y},l=E.getDistances(i,r);if(l.distance<=s){const t=i.y-l.dy/l.dx*i.x;e={x:0,y:t},a={x:n.width,y:t};}else {const t={x:o.x,y:o.y-n.height},r=E.getDistances(i,t);if(r.distance<=s){const t=-(i.y-r.dy/r.dx*i.x)/(r.dy/r.dx);e={x:t,y:0},a={x:t,y:n.height};}else {const t={x:o.x-n.width,y:o.y-n.height},r=E.getDistances(i,t);if(r.distance<=s){const t=i.y-r.dy/r.dx*i.x;e={x:-t/(r.dy/r.dx),y:t},a={x:e.x+n.width,y:e.y+n.height};}}}e&&a&&(et(t,i,e),et(t,o,a),u=!0);}if(u){if(t.lineWidth=e,r&&(t.globalCompositeOperation=l),t.strokeStyle=tt.getStyleFromRgb(c,d),h.enable){const e=tt.colorToRgb(h.color);e&&(t.shadowBlur=h.blur,t.shadowColor=tt.getStyleFromRgb(e));}t.stroke();}}static drawLinkTriangle(t,e,i,o,s,n,a,r){!function(t,e,i,o){t.beginPath(),t.moveTo(e.x,e.y),t.lineTo(i.x,i.y),t.lineTo(o.x,o.y),t.closePath();}(t,e,i,o),s&&(t.globalCompositeOperation=n),t.fillStyle=tt.getStyleFromRgb(a,r),t.fill();}static drawConnectLine(t,e,i,o,s){t.save(),et(t,o,s),t.lineWidth=e,t.strokeStyle=i,t.stroke(),t.restore();}static gradient(t,e,i,o){const s=Math.floor(i.getRadius()/e.getRadius()),n=e.getFillColor(),a=i.getFillColor();if(!n||!a)return;const r=e.getPosition(),l=i.getPosition(),c=tt.mix(n,a,e.getRadius(),i.getRadius()),d=t.createLinearGradient(r.x,r.y,l.x,l.y);return d.addColorStop(0,tt.getStyleFromHsl(n,o)),d.addColorStop(s>1?1:s,tt.getStyleFromRgb(c,o)),d.addColorStop(1,tt.getStyleFromHsl(a,o)),d}static drawGrabLine(t,e,i,o,s,n){t.save(),et(t,i,o),t.strokeStyle=tt.getStyleFromRgb(s,n),t.lineWidth=e,t.stroke(),t.restore();}static drawLight(t,e,i){const o=t.actualOptions.interactivity.modes.light.area;e.beginPath(),e.arc(i.x,i.y,o.radius,0,2*Math.PI);const s=e.createRadialGradient(i.x,i.y,0,i.x,i.y,o.radius),n=o.gradient,a={start:tt.colorToRgb(n.start),stop:tt.colorToRgb(n.stop)};a.start&&a.stop&&(s.addColorStop(0,tt.getStyleFromRgb(a.start)),s.addColorStop(1,tt.getStyleFromRgb(a.stop)),e.fillStyle=s,e.fill());}static drawParticleShadow(t,e,i,o){const s=i.getPosition(),n=t.actualOptions.interactivity.modes.light.shadow;e.save();const a=i.getRadius(),r=i.sides,l=2*Math.PI/r,c=-i.rotate.value+Math.PI/4,d=[];for(let t=0;t<r;t++)d.push({x:s.x+a*Math.sin(c+l*t)*1,y:s.y+a*Math.cos(c+l*t)*1});const h=[],u=n.length;for(const t of d){const e=Math.atan2(o.y-t.y,o.x-t.x),i=t.x+u*Math.sin(-e-Math.PI/2),s=t.y+u*Math.cos(-e-Math.PI/2);h.push({endX:i,endY:s,startX:t.x,startY:t.y});}const v=tt.colorToRgb(n.color);if(!v)return;const p=tt.getStyleFromRgb(v);for(let t=h.length-1;t>=0;t--){const i=t==h.length-1?0:t+1;e.beginPath(),e.moveTo(h[t].startX,h[t].startY),e.lineTo(h[i].startX,h[i].startY),e.lineTo(h[i].endX,h[i].endY),e.lineTo(h[t].endX,h[t].endY),e.fillStyle=p,e.fill();}e.restore();}static drawParticle(t,e,i,o,s,n,a,r,l,c,d){const h=i.getPosition();e.save(),e.translate(h.x,h.y),e.beginPath();const u=i.rotate.value+(i.options.rotate.path?i.velocity.angle:0);0!==u&&e.rotate(u),a&&(e.globalCompositeOperation=r);const v=i.shadowColor;d.enable&&v&&(e.shadowBlur=d.blur,e.shadowColor=tt.getStyleFromRgb(v),e.shadowOffsetX=d.offset.x,e.shadowOffsetY=d.offset.y),s&&(e.fillStyle=s);const p=i.stroke;e.lineWidth=i.strokeWidth,n&&(e.strokeStyle=n),it.drawShape(t,e,i,l,c,o),p.width>0&&e.stroke(),i.close&&e.closePath(),i.fill&&e.fill(),e.restore(),e.save(),e.translate(h.x,h.y),0!==u&&e.rotate(u),a&&(e.globalCompositeOperation=r),it.drawShapeAfterEffect(t,e,i,l,c,o),e.restore();}static drawShape(t,e,i,o,s,n){if(!i.shape)return;const a=t.drawers.get(i.shape);a&&a.draw(e,i,o,s,n,t.retina.pixelRatio);}static drawShapeAfterEffect(t,e,i,o,s,n){if(!i.shape)return;const a=t.drawers.get(i.shape);(null==a?void 0:a.afterEffect)&&a.afterEffect(e,i,o,s,n,t.retina.pixelRatio);}static drawPlugin(t,e,i){void 0!==e.draw&&(t.save(),e.draw(t,i),t.restore());}}class ot{constructor(t,e){this.position={x:t,y:e};}}class st extends ot{constructor(t,e,i){super(t,e),this.radius=i;}contains(t){return Math.pow(t.x-this.position.x,2)+Math.pow(t.y-this.position.y,2)<=this.radius*this.radius}intersects(t){const e=t,i=t,o=this.position,s=t.position,n=Math.abs(s.x-o.x),a=Math.abs(s.y-o.y),r=this.radius;if(void 0!==i.radius){return r+i.radius>Math.sqrt(n*n+a+a)}if(void 0!==e.size){const t=e.size.width,i=e.size.height,o=Math.pow(n-t,2)+Math.pow(a-i,2);return !(n>r+t||a>r+i)&&(n<=t||a<=i||o<=r*r)}return !1}}class nt extends ot{constructor(t,e,i,o){super(t,e),this.size={height:o,width:i};}contains(t){const e=this.size.width,i=this.size.height,o=this.position;return t.x>=o.x&&t.x<=o.x+e&&t.y>=o.y&&t.y<=o.y+i}intersects(t){const e=t,i=t,o=this.size.width,s=this.size.height,n=this.position,a=t.position;if(void 0!==i.radius)return i.intersects(this);if(void 0!==e.size){const t=e.size,i=t.width,r=t.height;return a.x<n.x+o&&a.x+i>n.x&&a.y<n.y+s&&a.y+r>n.y}return !1}}class at extends st{constructor(t,e,i,o){super(t,e,i),this.canvasSize=o,this.canvasSize={height:o.height,width:o.width};}contains(t){if(super.contains(t))return !0;const e={x:t.x-this.canvasSize.width,y:t.y};if(super.contains(e))return !0;const i={x:t.x-this.canvasSize.width,y:t.y-this.canvasSize.height};if(super.contains(i))return !0;const o={x:t.x,y:t.y-this.canvasSize.height};return super.contains(o)}intersects(t){if(super.intersects(t))return !0;const e=t,i=t,o={x:t.position.x-this.canvasSize.width,y:t.position.y-this.canvasSize.height};if(void 0!==i.radius){const t=new st(o.x,o.y,2*i.radius);return super.intersects(t)}if(void 0!==e.size){const t=new nt(o.x,o.y,2*e.size.width,2*e.size.height);return super.intersects(t)}return !1}}function rt(t,e,i,o,s){if(o){let o={passive:!0};"boolean"==typeof s?o.capture=s:void 0!==s&&(o=s),t.addEventListener(e,i,o);}else {const o=s;t.removeEventListener(e,i,o);}}!function(t){t.attract="attract",t.bubble="bubble",t.push="push",t.remove="remove",t.repulse="repulse",t.pause="pause",t.trail="trail";}(D||(D={})),function(t){t.none="none",t.split="split";}(O||(O={})),function(t){t.bounce="bounce",t.bubble="bubble",t.repulse="repulse";}(I||(I={})),function(t){t.attract="attract",t.bounce="bounce",t.bubble="bubble",t.connect="connect",t.grab="grab",t.light="light",t.repulse="repulse",t.slow="slow",t.trail="trail";}(F||(F={})),function(t){t.absorb="absorb",t.bounce="bounce",t.destroy="destroy";}(L||(L={})),function(t){t.bounce="bounce",t.bounceHorizontal="bounce-horizontal",t.bounceVertical="bounce-vertical",t.none="none",t.out="out",t.destroy="destroy",t.split="split";}(V||(V={})),function(t){t.precise="precise",t.percent="percent";}(H||(H={})),function(t){t.any="any",t.dark="dark",t.light="light";}(_||(_={})),function(t){t[t.increasing=0]="increasing",t[t.decreasing=1]="decreasing";}(q||(q={})),function(t){t.none="none",t.max="max",t.min="min";}(B||(B={})),function(t){t.color="color",t.opacity="opacity",t.size="size";}($||($={})),function(t){t.char="char",t.character="character",t.circle="circle",t.edge="edge",t.image="image",t.images="images",t.line="line",t.polygon="polygon",t.square="square",t.star="star",t.triangle="triangle";}(W||(W={})),function(t){t.max="max",t.min="min",t.random="random";}(G||(G={})),function(t){t.circle="circle",t.rectangle="rectangle";}(N||(N={})),function(t){t.canvas="canvas",t.parent="parent",t.window="window";}(U||(U={}));class lt{constructor(t){this.container=t,this.canPush=!0,this.mouseMoveHandler=t=>this.mouseTouchMove(t),this.touchStartHandler=t=>this.mouseTouchMove(t),this.touchMoveHandler=t=>this.mouseTouchMove(t),this.touchEndHandler=()=>this.mouseTouchFinish(),this.mouseLeaveHandler=()=>this.mouseTouchFinish(),this.touchCancelHandler=()=>this.mouseTouchFinish(),this.touchEndClickHandler=t=>this.mouseTouchClick(t),this.mouseUpHandler=t=>this.mouseTouchClick(t),this.mouseDownHandler=()=>this.mouseDown(),this.visibilityChangeHandler=()=>this.handleVisibilityChange(),this.resizeHandler=()=>this.handleWindowResize();}addListeners(){this.manageListeners(!0);}removeListeners(){this.manageListeners(!1);}manageListeners(t){var e;const i=this.container,o=i.actualOptions,s=o.interactivity.detectsOn;let n=Q.mouseLeaveEvent;if(s===U.window)i.interactivity.element=window,n=Q.mouseOutEvent;else if(s===U.parent&&i.canvas.element){const t=i.canvas.element;i.interactivity.element=null!==(e=t.parentElement)&&void 0!==e?e:t.parentNode;}else i.interactivity.element=i.canvas.element;const a=i.interactivity.element;if(!a)return;const r=a;(o.interactivity.events.onHover.enable||o.interactivity.events.onClick.enable)&&(rt(a,Q.mouseMoveEvent,this.mouseMoveHandler,t),rt(a,Q.touchStartEvent,this.touchStartHandler,t),rt(a,Q.touchMoveEvent,this.touchMoveHandler,t),o.interactivity.events.onClick.enable?(rt(a,Q.touchEndEvent,this.touchEndClickHandler,t),rt(a,Q.mouseUpEvent,this.mouseUpHandler,t),rt(a,Q.mouseDownEvent,this.mouseDownHandler,t)):rt(a,Q.touchEndEvent,this.touchEndHandler,t),rt(a,n,this.mouseLeaveHandler,t),rt(a,Q.touchCancelEvent,this.touchCancelHandler,t)),i.canvas.element&&(i.canvas.element.style.pointerEvents=r===i.canvas.element?"initial":"none"),o.interactivity.events.resize&&rt(window,Q.resizeEvent,this.resizeHandler,t),document&&rt(document,Q.visibilityChangeEvent,this.visibilityChangeHandler,t,!1);}handleWindowResize(){var t;null===(t=this.container.canvas)||void 0===t||t.windowResize();}handleVisibilityChange(){const t=this.container,e=t.actualOptions;this.mouseTouchFinish(),e.pauseOnBlur&&((null===document||void 0===document?void 0:document.hidden)?(t.pageHidden=!0,t.pause()):(t.pageHidden=!1,t.getAnimationStatus()?t.play(!0):t.draw()));}mouseDown(){const t=this.container.interactivity;if(t){const e=t.mouse;e.clicking=!0,e.downPosition=e.position;}}mouseTouchMove(t){var e,i,o,s,n,a,r;const l=this.container,c=l.actualOptions;if(void 0===(null===(e=l.interactivity)||void 0===e?void 0:e.element))return;let d;l.interactivity.mouse.inside=!0;const h=l.canvas.element;if(t.type.startsWith("mouse")){this.canPush=!0;const e=t;if(l.interactivity.element===window){if(h){const t=h.getBoundingClientRect();d={x:e.clientX-t.left,y:e.clientY-t.top};}}else if(c.interactivity.detectsOn===U.parent){const t=e.target,s=e.currentTarget,n=l.canvas.element;if(t&&s&&n){const i=t.getBoundingClientRect(),o=s.getBoundingClientRect(),a=n.getBoundingClientRect();d={x:e.offsetX+2*i.left-(o.left+a.left),y:e.offsetY+2*i.top-(o.top+a.top)};}else d={x:null!==(i=e.offsetX)&&void 0!==i?i:e.clientX,y:null!==(o=e.offsetY)&&void 0!==o?o:e.clientY};}else e.target===l.canvas.element&&(d={x:null!==(s=e.offsetX)&&void 0!==s?s:e.clientX,y:null!==(n=e.offsetY)&&void 0!==n?n:e.clientY});}else {this.canPush="touchmove"!==t.type;const e=t,i=e.touches[e.touches.length-1],o=null==h?void 0:h.getBoundingClientRect();d={x:i.clientX-(null!==(a=null==o?void 0:o.left)&&void 0!==a?a:0),y:i.clientY-(null!==(r=null==o?void 0:o.top)&&void 0!==r?r:0)};}const u=l.retina.pixelRatio;d&&(d.x*=u,d.y*=u),l.interactivity.mouse.position=d,l.interactivity.status=Q.mouseMoveEvent;}mouseTouchFinish(){const t=this.container.interactivity;if(void 0===t)return;const e=t.mouse;delete e.position,delete e.clickPosition,delete e.downPosition,t.status=Q.mouseLeaveEvent,e.inside=!1,e.clicking=!1;}mouseTouchClick(t){const e=this.container,i=e.actualOptions,o=e.interactivity.mouse;o.inside=!0;let s=!1;const n=o.position;if(void 0!==n&&i.interactivity.events.onClick.enable){for(const[,t]of e.plugins)if(void 0!==t.clickPositionValid&&(s=t.clickPositionValid(n),s))break;s||this.doMouseTouchClick(t),o.clicking=!1;}}doMouseTouchClick(t){const e=this.container,i=e.actualOptions;if(this.canPush){const t=e.interactivity.mouse.position;if(!t)return;e.interactivity.mouse.clickPosition={x:t.x,y:t.y},e.interactivity.mouse.clickTime=(new Date).getTime();const o=i.interactivity.events.onClick;if(o.mode instanceof Array)for(const t of o.mode)this.handleClickMode(t);else this.handleClickMode(o.mode);}"touchend"===t.type&&setTimeout((()=>this.mouseTouchFinish()),500);}handleClickMode(t){const e=this.container,i=e.actualOptions,o=i.interactivity.modes.push.quantity,s=i.interactivity.modes.remove.quantity;switch(t){case D.push:o>0&&e.particles.push(o,e.interactivity.mouse);break;case D.remove:e.particles.removeQuantity(s);break;case D.bubble:e.bubble.clicking=!0;break;case D.repulse:e.repulse.clicking=!0,e.repulse.count=0;for(const t of e.repulse.particles)t.velocity.setTo(t.initialVelocity);e.repulse.particles=[],e.repulse.finish=!1,setTimeout((()=>{e.destroyed||(e.repulse.clicking=!1);}),1e3*i.interactivity.modes.repulse.duration);break;case D.attract:e.attract.clicking=!0,e.attract.count=0;for(const t of e.attract.particles)t.velocity.setTo(t.initialVelocity);e.attract.particles=[],e.attract.finish=!1,setTimeout((()=>{e.destroyed||(e.attract.clicking=!1);}),1e3*i.interactivity.modes.attract.duration);break;case D.pause:e.getAnimationStatus()?e.pause():e.play();}for(const[,i]of e.plugins)i.handleClickMode&&i.handleClickMode(t);}}const ct=[],dt=new Map,ht=new Map,ut=new Map;class vt{static getPlugin(t){return ct.find((e=>e.id===t))}static addPlugin(t){vt.getPlugin(t.id)||ct.push(t);}static getAvailablePlugins(t){const e=new Map;for(const i of ct)i.needsPlugin(t.actualOptions)&&e.set(i.id,i.getPlugin(t));return e}static loadOptions(t,e){for(const i of ct)i.loadOptions(t,e);}static getPreset(t){return dt.get(t)}static addPreset(t,e){vt.getPreset(t)||dt.set(t,e);}static addShapeDrawer(t,e){vt.getShapeDrawer(t)||ht.set(t,e);}static getShapeDrawer(t){return ht.get(t)}static getSupportedShapes(){return ht.keys()}static getPathGenerator(t){return ut.get(t)}static addPathGenerator(t,e){vt.getPathGenerator(t)||ut.set(t,e);}}class pt{constructor(t,e){this.position=t,this.particle=e;}}class yt{constructor(t,e){this.rectangle=t,this.capacity=e,this.points=[],this.divided=!1;}subdivide(){const t=this.rectangle.position.x,e=this.rectangle.position.y,i=this.rectangle.size.width,o=this.rectangle.size.height,s=this.capacity;this.northEast=new yt(new nt(t,e,i/2,o/2),s),this.northWest=new yt(new nt(t+i/2,e,i/2,o/2),s),this.southEast=new yt(new nt(t,e+o/2,i/2,o/2),s),this.southWest=new yt(new nt(t+i/2,e+o/2,i/2,o/2),s),this.divided=!0;}insert(t){var e,i,o,s,n;return !!this.rectangle.contains(t.position)&&(this.points.length<this.capacity?(this.points.push(t),!0):(this.divided||this.subdivide(),null!==(n=(null===(e=this.northEast)||void 0===e?void 0:e.insert(t))||(null===(i=this.northWest)||void 0===i?void 0:i.insert(t))||(null===(o=this.southEast)||void 0===o?void 0:o.insert(t))||(null===(s=this.southWest)||void 0===s?void 0:s.insert(t)))&&void 0!==n&&n))}queryCircle(t,e){return this.query(new st(t.x,t.y,e))}queryCircleWarp(t,e,i){const o=i,s=i;return this.query(new at(t.x,t.y,e,void 0!==o.canvas?o.canvas.size:s))}queryRectangle(t,e){return this.query(new nt(t.x,t.y,e.width,e.height))}query(t,e){var i,o,s,n;const a=null!=e?e:[];if(!t.intersects(this.rectangle))return [];for(const e of this.points)t.contains(e.position)&&a.push(e.particle);return this.divided&&(null===(i=this.northEast)||void 0===i||i.query(t,a),null===(o=this.northWest)||void 0===o||o.query(t,a),null===(s=this.southEast)||void 0===s||s.query(t,a),null===(n=this.southWest)||void 0===n||n.query(t,a)),a}}var ft=function(t,e,i,o){return new(i||(i=Promise))((function(s,n){function a(t){try{l(o.next(t));}catch(t){n(t);}}function r(t){try{l(o.throw(t));}catch(t){n(t);}}function l(t){var e;t.done?s(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(a,r);}l((o=o.apply(t,e||[])).next());}))};class mt{getSidesCount(){return 12}init(t){var e;return ft(this,void 0,void 0,(function*(){const i=t.actualOptions;if(J.isInArray(W.char,i.particles.shape.type)||J.isInArray(W.character,i.particles.shape.type)){const t=null!==(e=i.particles.shape.options[W.character])&&void 0!==e?e:i.particles.shape.options[W.char];if(t instanceof Array)for(const e of t)yield J.loadFont(e);else void 0!==t&&(yield J.loadFont(t));}}))}draw(t,e,i){const o=e.shapeData;if(void 0===o)return;const s=o.value;if(void 0===s)return;const n=e;void 0===n.text&&(n.text=s instanceof Array?J.itemFromArray(s,e.randomIndexData):s);const a=n.text,r=o.style,l=o.weight,c=2*Math.round(i),d=o.font,h=e.fill,u=a.length*i/2;t.font=`${r} ${l} ${c}px "${d}"`;const v={x:-u,y:i/2};h?t.fillText(a,v.x,v.y):t.strokeText(a,v.x,v.y);}}var gt=function(t,e,i,o){return new(i||(i=Promise))((function(s,n){function a(t){try{l(o.next(t));}catch(t){n(t);}}function r(t){try{l(o.throw(t));}catch(t){n(t);}}function l(t){var e;t.done?s(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(a,r);}l((o=o.apply(t,e||[])).next());}))};class bt{constructor(){this.images=[];}getSidesCount(){return 12}getImages(t){const e=this.images.filter((e=>e.id===t.id));return e.length?e[0]:(this.images.push({id:t.id,images:[]}),this.getImages(t))}addImage(t,e){const i=this.getImages(t);null==i||i.images.push(e);}init(t){var e;return gt(this,void 0,void 0,(function*(){const i=t.actualOptions.particles.shape;if(!J.isInArray(W.image,i.type)&&!J.isInArray(W.images,i.type))return;const o=null!==(e=i.options[W.images])&&void 0!==e?e:i.options[W.image];if(o instanceof Array)for(const e of o)yield this.loadImageShape(t,e);else yield this.loadImageShape(t,o);}))}destroy(){this.images=[];}loadImageShape(t,e){return gt(this,void 0,void 0,(function*(){try{const i=e.replaceColor?yield J.downloadSvgImage(e.src):yield J.loadImage(e.src);i&&this.addImage(t,i);}catch(t){console.warn(`tsParticles error - ${e.src} not found`);}}))}draw(t,e,i,o){var s,n;if(!t)return;const a=e.image,r=null===(s=null==a?void 0:a.data)||void 0===s?void 0:s.element;if(!r)return;const l=null!==(n=null==a?void 0:a.ratio)&&void 0!==n?n:1,c={x:-i,y:-i};(null==a?void 0:a.data.svgData)&&(null==a?void 0:a.replaceColor)||(t.globalAlpha=o),t.drawImage(r,c.x,c.y,2*i,2*i/l),(null==a?void 0:a.data.svgData)&&(null==a?void 0:a.replaceColor)||(t.globalAlpha=1);}}class wt{getSidesCount(){return 1}draw(t,e,i){t.moveTo(0,-i/2),t.lineTo(0,i/2);}}class xt{getSidesCount(){return 12}draw(t,e,i){t.arc(0,0,i,0,2*Math.PI,!1);}}class kt{getSidesCount(t){var e,i;const o=t.shapeData;return null!==(i=null!==(e=null==o?void 0:o.sides)&&void 0!==e?e:null==o?void 0:o.nb_sides)&&void 0!==i?i:5}draw(t,e,i){const o=this.getCenter(e,i),s=this.getSidesData(e,i),n=s.count.numerator*s.count.denominator,a=s.count.numerator/s.count.denominator,r=180*(a-2)/a,l=Math.PI-Math.PI*r/180;if(t){t.beginPath(),t.translate(o.x,o.y),t.moveTo(0,0);for(let e=0;e<n;e++)t.lineTo(s.length,0),t.translate(s.length,0),t.rotate(l);}}}class Pt extends kt{getSidesCount(){return 3}getSidesData(t,e){return {count:{denominator:2,numerator:3},length:2*e}}getCenter(t,e){return {x:-e,y:e/1.66}}}class Mt{getSidesCount(t){var e,i;const o=t.shapeData;return null!==(i=null!==(e=null==o?void 0:o.sides)&&void 0!==e?e:null==o?void 0:o.nb_sides)&&void 0!==i?i:5}draw(t,e,i){var o;const s=e.shapeData,n=this.getSidesCount(e),a=null!==(o=null==s?void 0:s.inset)&&void 0!==o?o:2;t.moveTo(0,0-i);for(let e=0;e<n;e++)t.rotate(Math.PI/n),t.lineTo(0,0-i*a),t.rotate(Math.PI/n),t.lineTo(0,0-i);}}class Rt extends kt{getSidesData(t,e){var i,o;const s=t.shapeData,n=null!==(o=null!==(i=null==s?void 0:s.sides)&&void 0!==i?i:null==s?void 0:s.nb_sides)&&void 0!==o?o:5;return {count:{denominator:1,numerator:n},length:2.66*e/(n/3)}}getCenter(t,e){return {x:-e/(this.getSidesCount(t)/3.5),y:-e/.76}}}class St{constructor(t){this.container=t,this.size={height:0,width:0},this.context=null,this.generatedCanvas=!1;}init(){var t,e,i,o,s,n,a,r,l,c,d,h;this.resize();const u=this.container.actualOptions,v=this.element;v&&(u.fullScreen.enable?(this.originalStyle=J.deepExtend({},v.style),v.style.position="fixed",v.style.zIndex=u.fullScreen.zIndex.toString(10),v.style.top="0",v.style.left="0",v.style.width="100%",v.style.height="100%"):(v.style.position=null!==(e=null===(t=this.originalStyle)||void 0===t?void 0:t.position)&&void 0!==e?e:"",v.style.zIndex=null!==(o=null===(i=this.originalStyle)||void 0===i?void 0:i.zIndex)&&void 0!==o?o:"",v.style.top=null!==(n=null===(s=this.originalStyle)||void 0===s?void 0:s.top)&&void 0!==n?n:"",v.style.left=null!==(r=null===(a=this.originalStyle)||void 0===a?void 0:a.left)&&void 0!==r?r:"",v.style.width=null!==(c=null===(l=this.originalStyle)||void 0===l?void 0:l.width)&&void 0!==c?c:"",v.style.height=null!==(h=null===(d=this.originalStyle)||void 0===d?void 0:d.height)&&void 0!==h?h:""));const p=u.backgroundMask.cover,y=p.color,f=u.particles.move.trail,m=tt.colorToRgb(y);this.coverColor=void 0!==m?{r:m.r,g:m.g,b:m.b,a:p.opacity}:void 0,this.trailFillColor=tt.colorToRgb(f.fillColor),this.initBackground(),this.paint();}loadCanvas(t,e){var i;t.className||(t.className=Q.canvasClass),this.generatedCanvas&&(null===(i=this.element)||void 0===i||i.remove()),this.generatedCanvas=null!=e?e:this.generatedCanvas,this.element=t,this.originalStyle=J.deepExtend({},this.element.style),this.size.height=t.offsetHeight,this.size.width=t.offsetWidth,this.context=this.element.getContext("2d"),this.container.retina.init(),this.initBackground();}destroy(){var t;this.generatedCanvas&&(null===(t=this.element)||void 0===t||t.remove()),this.context&&it.clear(this.context,this.size);}paint(){const t=this.container.actualOptions;this.context&&(t.backgroundMask.enable&&t.backgroundMask.cover&&this.coverColor?(it.clear(this.context,this.size),this.paintBase(tt.getStyleFromRgb(this.coverColor,this.coverColor.a))):this.paintBase());}clear(){const t=this.container.actualOptions,e=t.particles.move.trail;t.backgroundMask.enable?this.paint():e.enable&&e.length>0&&this.trailFillColor?this.paintBase(tt.getStyleFromRgb(this.trailFillColor,1/e.length)):this.context&&it.clear(this.context,this.size);}windowResize(){if(!this.element)return;const t=this.container;t.canvas.resize(),t.actualOptions.setResponsive(this.size.width,t.retina.pixelRatio,t.options),t.particles.setDensity();for(const[,e]of t.plugins)void 0!==e.resize&&e.resize();}resize(){if(!this.element)return;const t=this.container,e=t.retina.pixelRatio,i=t.canvas.size,o=i.width,s=i.height;i.width=this.element.offsetWidth*e,i.height=this.element.offsetHeight*e,this.element.width=i.width,this.element.height=i.height,this.resizeFactor={width:i.width/o,height:i.height/s};}drawConnectLine(t,e){var i;const o=this.context;if(!o)return;const s=this.lineStyle(t,e);if(!s)return;const n=t.getPosition(),a=e.getPosition();it.drawConnectLine(o,null!==(i=t.linksWidth)&&void 0!==i?i:this.container.retina.linksWidth,s,n,a);}drawGrabLine(t,e,i,o){var s;const n=this.container,a=n.canvas.context;if(!a)return;const r=t.getPosition();it.drawGrabLine(a,null!==(s=t.linksWidth)&&void 0!==s?s:n.retina.linksWidth,r,o,e,i);}drawParticleShadow(t,e){this.context&&it.drawParticleShadow(this.container,this.context,t,e);}drawLinkTriangle(t,e,i){var o;const s=this.container,n=s.actualOptions,a=e.destination,r=i.destination,l=t.options.links.triangles,c=null!==(o=l.opacity)&&void 0!==o?o:(e.opacity+i.opacity)/2;if(c<=0)return;const d=t.getPosition(),h=a.getPosition(),u=r.getPosition(),v=this.context;if(!v)return;if(E.getDistance(d,h)>s.retina.linksDistance||E.getDistance(u,h)>s.retina.linksDistance||E.getDistance(u,d)>s.retina.linksDistance)return;let p=tt.colorToRgb(l.color);if(!p){const e=t.options.links,i=void 0!==e.id?s.particles.linksColors.get(e.id):s.particles.linksColor;p=tt.getLinkColor(t,a,i);}p&&it.drawLinkTriangle(v,d,h,u,n.backgroundMask.enable,n.backgroundMask.composite,p,c);}drawLinkLine(t,e){var i,o;const s=this.container,n=s.actualOptions,a=e.destination;let r=e.opacity;const l=t.getPosition(),c=a.getPosition(),d=this.context;if(!d)return;let h;const u=t.options.twinkle.lines;if(u.enable){const t=u.frequency,e=tt.colorToRgb(u.color);Math.random()<t&&void 0!==e&&(h=e,r=u.opacity);}if(!h){const e=t.options.links,i=void 0!==e.id?s.particles.linksColors.get(e.id):s.particles.linksColor;h=tt.getLinkColor(t,a,i);}if(!h)return;const v=null!==(i=t.linksWidth)&&void 0!==i?i:s.retina.linksWidth,p=null!==(o=t.linksDistance)&&void 0!==o?o:s.retina.linksDistance;it.drawLinkLine(d,v,l,c,p,s.canvas.size,t.options.links.warp,n.backgroundMask.enable,n.backgroundMask.composite,h,r,t.options.links.shadow);}drawParticle(t,e){var i,o,s,n;if(!1===(null===(i=t.image)||void 0===i?void 0:i.loaded)||t.spawning||t.destroyed)return;const a=t.getFillColor(),r=null!==(o=t.getStrokeColor())&&void 0!==o?o:a;if(!a&&!r)return;const l=this.container.actualOptions,c=t.options.twinkle.particles,d=c.frequency,h=tt.colorToRgb(c.color),u=c.enable&&Math.random()<d,v=t.getRadius(),p=u?c.opacity:null!==(s=t.bubble.opacity)&&void 0!==s?s:t.opacity.value,y=t.infecter.infectionStage,f=l.infection.stages,m=void 0!==y?f[y].color:void 0,g=tt.colorToRgb(m),b=u&&void 0!==h?h:null!=g?g:a?tt.hslToRgb(a):void 0,w=u&&void 0!==h?h:null!=g?g:r?tt.hslToRgb(r):void 0,x=void 0!==b?tt.getStyleFromRgb(b,p):void 0;if(!this.context||!x&&!w)return;const k=void 0!==w?tt.getStyleFromRgb(w,null!==(n=t.stroke.opacity)&&void 0!==n?n:p):x;this.drawParticleLinks(t),v>0&&it.drawParticle(this.container,this.context,t,e,x,k,l.backgroundMask.enable,l.backgroundMask.composite,v,p,t.options.shadow);}drawParticleLinks(t){if(!this.context)return;const e=this.container,i=e.particles,o=t.options;if(t.links.length>0){this.context.save();const s=t.links.filter((i=>e.particles.getLinkFrequency(t,i.destination)<=o.links.frequency));for(const n of s){const a=n.destination;if(o.links.triangles.enable){const r=s.map((t=>t.destination)),l=a.links.filter((t=>e.particles.getLinkFrequency(a,t.destination)<=a.options.links.frequency&&r.indexOf(t.destination)>=0));if(l.length)for(const e of l){const s=e.destination;i.getTriangleFrequency(t,a,s)>o.links.triangles.frequency||this.drawLinkTriangle(t,n,e);}}n.opacity>0&&e.retina.linksWidth>0&&this.drawLinkLine(t,n);}this.context.restore();}}drawPlugin(t,e){this.context&&it.drawPlugin(this.context,t,e);}drawLight(t){this.context&&it.drawLight(this.container,this.context,t);}paintBase(t){this.context&&it.paintBase(this.context,this.size,t);}lineStyle(t,e){if(!this.context)return;const i=this.container.actualOptions.interactivity.modes.connect;return it.gradient(this.context,t,e,i.links.opacity)}initBackground(){const t=this.container.actualOptions.background,e=this.element,i=null==e?void 0:e.style;if(i){if(t.color){const e=tt.colorToRgb(t.color);i.backgroundColor=e?tt.getStyleFromRgb(e,t.opacity):"";}else i.backgroundColor="";i.backgroundImage=t.image||"",i.backgroundPosition=t.position||"",i.backgroundRepeat=t.repeat||"",i.backgroundSize=t.size||"";}}}function Ct(t,e,i,o,s){switch(e){case B.max:i>=s&&t.destroy();break;case B.min:i<=o&&t.destroy();}}class zt{constructor(t,e){this.container=t,this.particle=e;}update(t){this.particle.destroyed||(this.updateLife(t),this.particle.destroyed||this.particle.spawning||(this.updateOpacity(t),this.updateSize(t),this.updateAngle(t),this.updateColor(t),this.updateStrokeColor(t),this.updateOutModes(t)));}updateLife(t){const e=this.particle;let i=!1;if(e.spawning&&(e.lifeDelayTime+=t.value,e.lifeDelayTime>=e.lifeDelay&&(i=!0,e.spawning=!1,e.lifeDelayTime=0,e.lifeTime=0)),-1!==e.lifeDuration&&!e.spawning&&(i?e.lifeTime=0:e.lifeTime+=t.value,e.lifeTime>=e.lifeDuration)){if(e.lifeTime=0,e.livesRemaining>0&&e.livesRemaining--,0===e.livesRemaining)return void e.destroy();const t=this.container.canvas.size;e.position.x=E.randomInRange(E.setRangeValue(0,t.width)),e.position.y=E.randomInRange(E.setRangeValue(0,t.height)),e.spawning=!0,e.lifeDelayTime=0,e.lifeTime=0,e.reset();const i=e.options.life;e.lifeDelay=1e3*E.getValue(i.delay),e.lifeDuration=1e3*E.getValue(i.duration);}}updateOpacity(t){var e,i;const o=this.particle,s=o.options.opacity,n=s.animation,a=E.getRangeMin(s.value),r=E.getRangeMax(s.value);if(!o.destroyed&&n.enable&&(n.count<=0||o.loops.size<n.count)){switch(o.opacity.status){case q.increasing:o.opacity.value>=r?(o.opacity.status=q.decreasing,o.loops.opacity++):o.opacity.value+=(null!==(e=o.opacity.velocity)&&void 0!==e?e:0)*t.factor;break;case q.decreasing:o.opacity.value<=a?(o.opacity.status=q.increasing,o.loops.opacity++):o.opacity.value-=(null!==(i=o.opacity.velocity)&&void 0!==i?i:0)*t.factor;}Ct(o,n.destroy,o.opacity.value,a,r),o.destroyed||(o.opacity.value=E.clamp(o.opacity.value,a,r));}}updateSize(t){var e;const i=this.container,o=this.particle,s=o.options.size,n=s.animation,a=(null!==(e=o.size.velocity)&&void 0!==e?e:0)*t.factor,r=E.getRangeMin(s.value)*i.retina.pixelRatio,l=E.getRangeMax(s.value)*i.retina.pixelRatio;if(!o.destroyed&&n.enable&&(n.count<=0||o.loops.size<n.count)){switch(o.size.status){case q.increasing:o.size.value>=l?(o.size.status=q.decreasing,o.loops.size++):o.size.value+=a;break;case q.decreasing:o.size.value<=r?(o.size.status=q.increasing,o.loops.size++):o.size.value-=a;}Ct(o,n.destroy,o.size.value,r,l),o.destroyed||(o.size.value=E.clamp(o.size.value,r,l));}}updateAngle(t){var e;const i=this.particle,o=i.options.rotate.animation,s=(null!==(e=i.rotate.velocity)&&void 0!==e?e:0)*t.factor,n=2*Math.PI;if(o.enable)switch(i.rotate.status){case q.increasing:i.rotate.value+=s,i.rotate.value>n&&(i.rotate.value-=n);break;case q.decreasing:default:i.rotate.value-=s,i.rotate.value<0&&(i.rotate.value+=n);}}updateColor(t){var e,i,o;const s=this.particle,n=s.options.color.animation;void 0!==(null===(e=s.color)||void 0===e?void 0:e.h)&&this.updateColorValue(s,t,s.color.h,n.h,360,!1),void 0!==(null===(i=s.color)||void 0===i?void 0:i.s)&&this.updateColorValue(s,t,s.color.s,n.s,100,!0),void 0!==(null===(o=s.color)||void 0===o?void 0:o.l)&&this.updateColorValue(s,t,s.color.l,n.l,100,!0);}updateStrokeColor(t){var e,i,o,s,n,a,r,l,c,d,h,u;const v=this.particle;if(!v.stroke.color)return;const p=v.stroke.color.animation,y=p;if(void 0!==y.enable){const s=null!==(i=null===(e=v.strokeColor)||void 0===e?void 0:e.h)&&void 0!==i?i:null===(o=v.color)||void 0===o?void 0:o.h;s&&this.updateColorValue(v,t,s,y,360,!1);}else {const e=p,i=null!==(n=null===(s=v.strokeColor)||void 0===s?void 0:s.h)&&void 0!==n?n:null===(a=v.color)||void 0===a?void 0:a.h;i&&this.updateColorValue(v,t,i,e.h,360,!1);const o=null!==(l=null===(r=v.strokeColor)||void 0===r?void 0:r.s)&&void 0!==l?l:null===(c=v.color)||void 0===c?void 0:c.s;o&&this.updateColorValue(v,t,o,e.s,100,!0);const y=null!==(h=null===(d=v.strokeColor)||void 0===d?void 0:d.l)&&void 0!==h?h:null===(u=v.color)||void 0===u?void 0:u.l;y&&this.updateColorValue(v,t,y,e.l,100,!0);}}updateColorValue(t,e,i,o,s,n){var a;const r=i;if(!r||!o.enable)return;const l=E.randomInRange(o.offset),c=(null!==(a=i.velocity)&&void 0!==a?a:0)*e.factor+3.6*l;n&&r.status!==q.increasing?(r.value-=c,r.value<0&&(r.status=q.increasing,r.value+=r.value)):(r.value+=c,n&&r.value>s&&(r.status=q.decreasing,r.value-=r.value%s)),r.value>s&&(r.value%=s);}updateOutModes(t){var e,i,o,s;const n=this.particle.options.move.outModes;this.updateOutMode(t,null!==(e=n.bottom)&&void 0!==e?e:n.default,C.bottom),this.updateOutMode(t,null!==(i=n.left)&&void 0!==i?i:n.default,C.left),this.updateOutMode(t,null!==(o=n.right)&&void 0!==o?o:n.default,C.right),this.updateOutMode(t,null!==(s=n.top)&&void 0!==s?s:n.default,C.top);}updateOutMode(t,e,i){const o=this.container,s=this.particle;switch(e){case V.bounce:case V.bounceVertical:case V.bounceHorizontal:case"bounceVertical":case"bounceHorizontal":case V.split:this.updateBounce(t,i,e);break;case V.destroy:J.isPointInside(s.position,o.canvas.size,s.getRadius(),i)||o.particles.remove(s,!0);break;case V.out:J.isPointInside(s.position,o.canvas.size,s.getRadius(),i)||this.fixOutOfCanvasPosition(i);break;case V.none:this.bounceNone(i);}}fixOutOfCanvasPosition(t){const e=this.container,i=this.particle,o=i.options.move.warp,s=e.canvas.size,n={bottom:s.height+i.getRadius()-i.offset.y,left:-i.getRadius()-i.offset.x,right:s.width+i.getRadius()+i.offset.x,top:-i.getRadius()-i.offset.y},a=i.getRadius(),r=J.calculateBounds(i.position,a);t===C.right&&r.left>s.width-i.offset.x?(i.position.x=n.left,o||(i.position.y=Math.random()*s.height)):t===C.left&&r.right<-i.offset.x&&(i.position.x=n.right,o||(i.position.y=Math.random()*s.height)),t===C.bottom&&r.top>s.height-i.offset.y?(o||(i.position.x=Math.random()*s.width),i.position.y=n.top):t===C.top&&r.bottom<-i.offset.y&&(o||(i.position.x=Math.random()*s.width),i.position.y=n.bottom);}updateBounce(t,e,i){const o=this.container,s=this.particle;let n=!1;for(const[,i]of o.plugins)if(void 0!==i.particleBounce&&(n=i.particleBounce(s,t,e)),n)break;if(n)return;const a=s.getPosition(),r=s.offset,l=s.getRadius(),c=J.calculateBounds(a,l),d=o.canvas.size;!function(t){if(t.outMode===V.bounce||t.outMode===V.bounceHorizontal||"bounceHorizontal"===t.outMode||t.outMode===V.split){const e=t.particle.velocity.x;let i=!1;if(t.direction===C.right&&t.bounds.right>=t.canvasSize.width&&e>0||t.direction===C.left&&t.bounds.left<=0&&e<0){const e=E.getValue(t.particle.options.bounce.horizontal);t.particle.velocity.x*=-e,i=!0;}if(!i)return;const o=t.offset.x+t.size;t.bounds.right>=t.canvasSize.width?t.particle.position.x=t.canvasSize.width-o:t.bounds.left<=0&&(t.particle.position.x=o),t.outMode===V.split&&t.particle.destroy();}}({particle:s,outMode:i,direction:e,bounds:c,canvasSize:d,offset:r,size:l}),function(t){if(t.outMode===V.bounce||t.outMode===V.bounceVertical||"bounceVertical"===t.outMode||t.outMode===V.split){const e=t.particle.velocity.y;let i=!1;if(t.direction===C.bottom&&t.bounds.bottom>=t.canvasSize.height&&e>0||t.direction===C.top&&t.bounds.top<=0&&e<0){const e=E.getValue(t.particle.options.bounce.vertical);t.particle.velocity.y*=-e,i=!0;}if(!i)return;const o=t.offset.y+t.size;t.bounds.bottom>=t.canvasSize.height?t.particle.position.y=t.canvasSize.height-o:t.bounds.top<=0&&(t.particle.position.y=o),t.outMode===V.split&&t.particle.destroy();}}({particle:s,outMode:i,direction:e,bounds:c,canvasSize:d,offset:r,size:l});}bounceNone(t){const e=this.particle;if(e.options.move.distance)return;const i=e.options.move.gravity,o=this.container;if(i.enable){const s=e.position;(i.acceleration>=0&&s.y>o.canvas.size.height&&t===C.bottom||i.acceleration<0&&s.y<0&&t===C.top)&&o.particles.remove(e);}else J.isPointInside(e.position,o.canvas.size,e.getRadius(),t)||o.particles.remove(e);}}class At{constructor(){this.value="#fff";}static create(t,e){const i=null!=t?t:new At;return void 0!==e&&i.load("string"==typeof e?{value:e}:e),i}load(t){void 0!==(null==t?void 0:t.value)&&(this.value=t.value);}}class Tt{constructor(){this.blur=5,this.color=new At,this.enable=!1,this.color.value="#00ff00";}load(t){void 0!==t&&(void 0!==t.blur&&(this.blur=t.blur),this.color=At.create(this.color,t.color),void 0!==t.enable&&(this.enable=t.enable));}}class Et{constructor(){this.enable=!1,this.frequency=1;}load(t){void 0!==t&&(void 0!==t.color&&(this.color=At.create(this.color,t.color)),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.frequency&&(this.frequency=t.frequency),void 0!==t.opacity&&(this.opacity=t.opacity));}}class Dt{constructor(){this.blink=!1,this.color=new At,this.consent=!1,this.distance=100,this.enable=!1,this.frequency=1,this.opacity=1,this.shadow=new Tt,this.triangles=new Et,this.width=1,this.warp=!1;}load(t){void 0!==t&&(void 0!==t.id&&(this.id=t.id),void 0!==t.blink&&(this.blink=t.blink),this.color=At.create(this.color,t.color),void 0!==t.consent&&(this.consent=t.consent),void 0!==t.distance&&(this.distance=t.distance),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.frequency&&(this.frequency=t.frequency),void 0!==t.opacity&&(this.opacity=t.opacity),this.shadow.load(t.shadow),this.triangles.load(t.triangles),void 0!==t.width&&(this.width=t.width),void 0!==t.warp&&(this.warp=t.warp));}}class Ot{constructor(){this.enable=!1,this.rotate={x:3e3,y:3e3};}get rotateX(){return this.rotate.x}set rotateX(t){this.rotate.x=t;}get rotateY(){return this.rotate.y}set rotateY(t){this.rotate.y=t;}load(t){var e,i,o,s;if(void 0===t)return;void 0!==t.enable&&(this.enable=t.enable);const n=null!==(i=null===(e=t.rotate)||void 0===e?void 0:e.x)&&void 0!==i?i:t.rotateX;void 0!==n&&(this.rotate.x=n);const a=null!==(s=null===(o=t.rotate)||void 0===o?void 0:o.y)&&void 0!==s?s:t.rotateY;void 0!==a&&(this.rotate.y=a);}}class It{constructor(){this.enable=!1,this.length=10,this.fillColor=new At,this.fillColor.value="#000000";}load(t){void 0!==t&&(void 0!==t.enable&&(this.enable=t.enable),this.fillColor=At.create(this.fillColor,t.fillColor),void 0!==t.length&&(this.length=t.length));}}class Ft{constructor(){this.enable=!1,this.minimumValue=0;}load(t){t&&(void 0!==t.enable&&(this.enable=t.enable),void 0!==t.minimumValue&&(this.minimumValue=t.minimumValue));}}class Lt{constructor(){this.random=new Ft,this.value=0;}load(t){t&&("boolean"==typeof t.random?this.random.enable=t.random:this.random.load(t.random),void 0!==t.value&&(this.value=E.setRangeValue(t.value,this.random.enable?this.random.minimumValue:void 0)));}}class Vt extends Lt{constructor(){super();}}class Ht{constructor(){this.clamp=!0,this.delay=new Vt,this.enable=!1;}load(t){void 0!==t&&(void 0!==t.clamp&&(this.clamp=t.clamp),this.delay.load(t.delay),void 0!==t.enable&&(this.enable=t.enable),this.generator=t.generator);}}class _t{constructor(){this.offset=45,this.value=90;}load(t){void 0!==t&&(void 0!==t.offset&&(this.offset=t.offset),void 0!==t.value&&(this.value=t.value));}}class qt{constructor(){this.acceleration=9.81,this.enable=!1,this.maxSpeed=50;}load(t){t&&(void 0!==t.acceleration&&(this.acceleration=t.acceleration),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.maxSpeed&&(this.maxSpeed=t.maxSpeed));}}class Bt{constructor(){this.default=V.out;}load(t){var e,i,o,s;t&&(void 0!==t.default&&(this.default=t.default),this.bottom=null!==(e=t.bottom)&&void 0!==e?e:t.default,this.left=null!==(i=t.left)&&void 0!==i?i:t.default,this.right=null!==(o=t.right)&&void 0!==o?o:t.default,this.top=null!==(s=t.top)&&void 0!==s?s:t.default);}}class $t{constructor(){this.angle=new _t,this.attract=new Ot,this.decay=0,this.distance=0,this.direction=z.none,this.drift=0,this.enable=!1,this.gravity=new qt,this.path=new Ht,this.outModes=new Bt,this.random=!1,this.size=!1,this.speed=2,this.straight=!1,this.trail=new It,this.vibrate=!1,this.warp=!1;}get collisions(){return !1}set collisions(t){}get bounce(){return this.collisions}set bounce(t){this.collisions=t;}get out_mode(){return this.outMode}set out_mode(t){this.outMode=t;}get outMode(){return this.outModes.default}set outMode(t){this.outModes.default=t;}get noise(){return this.path}set noise(t){this.path=t;}load(t){var e,i,o;if(void 0===t)return;void 0!==t.angle&&("number"==typeof t.angle?this.angle.value=t.angle:this.angle.load(t.angle)),this.attract.load(t.attract),void 0!==t.decay&&(this.decay=t.decay),void 0!==t.direction&&(this.direction=t.direction),void 0!==t.distance&&(this.distance=t.distance),void 0!==t.drift&&(this.drift=E.setRangeValue(t.drift)),void 0!==t.enable&&(this.enable=t.enable),this.gravity.load(t.gravity);const s=null!==(e=t.outMode)&&void 0!==e?e:t.out_mode;void 0===t.outModes&&void 0===s||("string"==typeof t.outModes||void 0===t.outModes&&void 0!==s?this.outModes.load({default:null!==(i=t.outModes)&&void 0!==i?i:s}):this.outModes.load(t.outModes)),this.path.load(null!==(o=t.path)&&void 0!==o?o:t.noise),void 0!==t.random&&(this.random=t.random),void 0!==t.size&&(this.size=t.size),void 0!==t.speed&&(this.speed=E.setRangeValue(t.speed)),void 0!==t.straight&&(this.straight=t.straight),this.trail.load(t.trail),void 0!==t.vibrate&&(this.vibrate=t.vibrate),void 0!==t.warp&&(this.warp=t.warp);}}class Wt{constructor(){this.enable=!1,this.area=800,this.factor=1e3;}get value_area(){return this.area}set value_area(t){this.area=t;}load(t){var e;if(void 0===t)return;void 0!==t.enable&&(this.enable=t.enable);const i=null!==(e=t.area)&&void 0!==e?e:t.value_area;void 0!==i&&(this.area=i),void 0!==t.factor&&(this.factor=t.factor);}}class Gt{constructor(){this.density=new Wt,this.limit=0,this.value=100;}get max(){return this.limit}set max(t){this.limit=t;}load(t){var e;if(void 0===t)return;this.density.load(t.density);const i=null!==(e=t.limit)&&void 0!==e?e:t.max;void 0!==i&&(this.limit=i),void 0!==t.value&&(this.value=t.value);}}class Nt{constructor(){this.count=0,this.enable=!1,this.speed=1,this.sync=!1;}load(t){t&&(void 0!==t.count&&(this.count=t.count),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.speed&&(this.speed=t.speed),void 0!==t.sync&&(this.sync=t.sync));}}class Ut extends Nt{constructor(){super(),this.destroy=B.none,this.enable=!1,this.minimumValue=0,this.speed=2,this.startValue=G.random,this.sync=!1;}get opacity_min(){return this.minimumValue}set opacity_min(t){this.minimumValue=t;}load(t){var e;if(void 0===t)return;super.load(t),void 0!==t.destroy&&(this.destroy=t.destroy),void 0!==t.enable&&(this.enable=t.enable);const i=null!==(e=t.minimumValue)&&void 0!==e?e:t.opacity_min;void 0!==i&&(this.minimumValue=i),void 0!==t.speed&&(this.speed=t.speed),void 0!==t.startValue&&(this.startValue=t.startValue),void 0!==t.sync&&(this.sync=t.sync);}}class jt extends Lt{constructor(){super(),this.animation=new Ut,this.random.minimumValue=.1,this.value=1;}get anim(){return this.animation}set anim(t){this.animation=t;}load(t){var e;if(!t)return;super.load(t);const i=null!==(e=t.animation)&&void 0!==e?e:t.anim;void 0!==i&&(this.animation.load(i),this.value=E.setRangeValue(this.value,this.animation.enable?this.animation.minimumValue:void 0));}}class Yt{constructor(){this.options={},this.type=W.circle;}get image(){var t;return null!==(t=this.options[W.image])&&void 0!==t?t:this.options[W.images]}set image(t){this.options[W.image]=t,this.options[W.images]=t;}get custom(){return this.options}set custom(t){this.options=t;}get images(){return this.image instanceof Array?this.image:[this.image]}set images(t){this.image=t;}get stroke(){return []}set stroke(t){}get character(){var t;return null!==(t=this.options[W.character])&&void 0!==t?t:this.options[W.char]}set character(t){this.options[W.character]=t,this.options[W.char]=t;}get polygon(){var t;return null!==(t=this.options[W.polygon])&&void 0!==t?t:this.options[W.star]}set polygon(t){this.options[W.polygon]=t,this.options[W.star]=t;}load(t){var e,i,o;if(void 0===t)return;const s=null!==(e=t.options)&&void 0!==e?e:t.custom;if(void 0!==s)for(const t in s){const e=s[t];void 0!==e&&(this.options[t]=J.deepExtend(null!==(i=this.options[t])&&void 0!==i?i:{},e));}this.loadShape(t.character,W.character,W.char,!0),this.loadShape(t.polygon,W.polygon,W.star,!1),this.loadShape(null!==(o=t.image)&&void 0!==o?o:t.images,W.image,W.images,!0),void 0!==t.type&&(this.type=t.type);}loadShape(t,e,i,o){var s,n,a,r;void 0!==t&&(t instanceof Array?(this.options[e]instanceof Array||(this.options[e]=[],this.options[i]&&!o||(this.options[i]=[])),this.options[e]=J.deepExtend(null!==(s=this.options[e])&&void 0!==s?s:[],t),this.options[i]&&!o||(this.options[i]=J.deepExtend(null!==(n=this.options[i])&&void 0!==n?n:[],t))):(this.options[e]instanceof Array&&(this.options[e]={},this.options[i]&&!o||(this.options[i]={})),this.options[e]=J.deepExtend(null!==(a=this.options[e])&&void 0!==a?a:{},t),this.options[i]&&!o||(this.options[i]=J.deepExtend(null!==(r=this.options[i])&&void 0!==r?r:{},t))));}}class Xt extends Nt{constructor(){super(),this.destroy=B.none,this.enable=!1,this.minimumValue=0,this.speed=5,this.startValue=G.random,this.sync=!1;}get size_min(){return this.minimumValue}set size_min(t){this.minimumValue=t;}load(t){var e;if(void 0===t)return;super.load(t),void 0!==t.destroy&&(this.destroy=t.destroy),void 0!==t.enable&&(this.enable=t.enable);const i=null!==(e=t.minimumValue)&&void 0!==e?e:t.size_min;void 0!==i&&(this.minimumValue=i),void 0!==t.speed&&(this.speed=t.speed),void 0!==t.startValue&&(this.startValue=t.startValue),void 0!==t.sync&&(this.sync=t.sync);}}class Jt extends Lt{constructor(){super(),this.animation=new Xt,this.random.minimumValue=1,this.value=3;}get anim(){return this.animation}set anim(t){this.animation=t;}load(t){var e;if(!t)return;super.load(t);const i=null!==(e=t.animation)&&void 0!==e?e:t.anim;void 0!==i&&(this.animation.load(i),this.value=E.setRangeValue(this.value,this.animation.enable?this.animation.minimumValue:void 0));}}class Qt{constructor(){this.enable=!1,this.speed=0,this.sync=!1;}load(t){void 0!==t&&(void 0!==t.enable&&(this.enable=t.enable),void 0!==t.speed&&(this.speed=t.speed),void 0!==t.sync&&(this.sync=t.sync));}}class Zt extends Lt{constructor(){super(),this.animation=new Qt,this.direction=A.clockwise,this.path=!1,this.value={min:0,max:360};}load(t){t&&(super.load(t),void 0!==t.direction&&(this.direction=t.direction),this.animation.load(t.animation),void 0!==t.path&&(this.path=t.path));}}class Kt{constructor(){this.blur=0,this.color=new At,this.enable=!1,this.offset={x:0,y:0},this.color.value="#000000";}load(t){void 0!==t&&(void 0!==t.blur&&(this.blur=t.blur),this.color=At.create(this.color,t.color),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.offset&&(void 0!==t.offset.x&&(this.offset.x=t.offset.x),void 0!==t.offset.y&&(this.offset.y=t.offset.y)));}}class te{constructor(){this.count=0,this.enable=!1,this.offset=0,this.speed=1,this.sync=!0;}load(t){void 0!==t&&(void 0!==t.count&&(this.count=t.count),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.offset&&(this.offset=E.setRangeValue(t.offset)),void 0!==t.speed&&(this.speed=t.speed),void 0!==t.sync&&(this.sync=t.sync));}}class ee{constructor(){this.h=new te,this.s=new te,this.l=new te;}load(t){t&&(this.h.load(t.h),this.s.load(t.s),this.l.load(t.l));}}class ie extends At{constructor(){super(),this.animation=new ee;}static create(t,e){const i=null!=t?t:new ie;return void 0!==e&&i.load("string"==typeof e?{value:e}:e),i}load(t){if(super.load(t),!t)return;const e=t.animation;void 0!==e&&(void 0!==e.enable?this.animation.h.load(e):this.animation.load(t.animation));}}class oe{constructor(){this.width=0;}load(t){void 0!==t&&(void 0!==t.color&&(this.color=ie.create(this.color,t.color)),void 0!==t.width&&(this.width=t.width),void 0!==t.opacity&&(this.opacity=t.opacity));}}class se extends Lt{constructor(){super(),this.random.minimumValue=.1,this.value=1;}}class ne{constructor(){this.horizontal=new se,this.vertical=new se;}load(t){t&&(this.horizontal.load(t.horizontal),this.vertical.load(t.vertical));}}class ae{constructor(){this.enable=!0,this.retries=0;}load(t){t&&(void 0!==t.enable&&(this.enable=t.enable),void 0!==t.retries&&(this.retries=t.retries));}}class re{constructor(){this.bounce=new ne,this.enable=!1,this.mode=L.bounce,this.overlap=new ae;}load(t){void 0!==t&&(this.bounce.load(t.bounce),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.mode&&(this.mode=t.mode),this.overlap.load(t.overlap));}}class le{constructor(){this.enable=!1,this.frequency=.05,this.opacity=1;}load(t){void 0!==t&&(void 0!==t.color&&(this.color=At.create(this.color,t.color)),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.frequency&&(this.frequency=t.frequency),void 0!==t.opacity&&(this.opacity=t.opacity));}}class ce{constructor(){this.lines=new le,this.particles=new le;}load(t){void 0!==t&&(this.lines.load(t.lines),this.particles.load(t.particles));}}class de extends Lt{constructor(){super(),this.sync=!1;}load(t){t&&(super.load(t),void 0!==t.sync&&(this.sync=t.sync));}}class he extends Lt{constructor(){super(),this.random.minimumValue=1e-4,this.sync=!1;}load(t){void 0!==t&&(super.load(t),void 0!==t.sync&&(this.sync=t.sync));}}class ue{constructor(){this.count=0,this.delay=new de,this.duration=new he;}load(t){void 0!==t&&(void 0!==t.count&&(this.count=t.count),this.delay.load(t.delay),this.duration.load(t.duration));}}class ve extends Lt{constructor(){super(),this.value=3;}}class pe extends Lt{constructor(){super(),this.value={min:4,max:9};}}class ye{constructor(){this.count=1,this.factor=new ve,this.rate=new pe;}load(t){t&&(void 0!==t.count&&(this.count=t.count),this.factor.load(t.factor),this.rate.load(t.rate),void 0!==t.particles&&(this.particles=J.deepExtend({},t.particles)));}}class fe{constructor(){this.mode=O.none,this.split=new ye;}load(t){t&&(void 0!==t.mode&&(this.mode=t.mode),this.split.load(t.split));}}class me{constructor(){this.bounce=new ne,this.collisions=new re,this.color=new ie,this.destroy=new fe,this.life=new ue,this.links=new Dt,this.move=new $t,this.number=new Gt,this.opacity=new jt,this.reduceDuplicates=!1,this.rotate=new Zt,this.shadow=new Kt,this.shape=new Yt,this.size=new Jt,this.stroke=new oe,this.twinkle=new ce;}get line_linked(){return this.links}set line_linked(t){this.links=t;}get lineLinked(){return this.links}set lineLinked(t){this.links=t;}load(t){var e,i,o,s,n,a,r;if(void 0===t)return;this.bounce.load(t.bounce),this.color=ie.create(this.color,t.color),this.destroy.load(t.destroy),this.life.load(t.life);const l=null!==(i=null!==(e=t.links)&&void 0!==e?e:t.lineLinked)&&void 0!==i?i:t.line_linked;void 0!==l&&this.links.load(l),this.move.load(t.move),this.number.load(t.number),this.opacity.load(t.opacity),void 0!==t.reduceDuplicates&&(this.reduceDuplicates=t.reduceDuplicates),this.rotate.load(t.rotate),this.shape.load(t.shape),this.size.load(t.size),this.shadow.load(t.shadow),this.twinkle.load(t.twinkle);const c=null!==(s=null===(o=t.move)||void 0===o?void 0:o.collisions)&&void 0!==s?s:null===(n=t.move)||void 0===n?void 0:n.bounce;void 0!==c&&(this.collisions.enable=c),this.collisions.load(t.collisions);const d=null!==(a=t.stroke)&&void 0!==a?a:null===(r=t.shape)||void 0===r?void 0:r.stroke;void 0!==d&&(d instanceof Array?this.stroke=d.map((t=>{const e=new oe;return e.load(t),e})):(this.stroke instanceof Array&&(this.stroke=new oe),this.stroke.load(d)));}}class ge{constructor(t){this.container=t;}startInfection(t){t>this.container.actualOptions.infection.stages.length||t<0||(this.infectionDelay=0,this.infectionDelayStage=t);}updateInfectionStage(t){t>this.container.actualOptions.infection.stages.length||t<0||void 0!==this.infectionStage&&this.infectionStage>t||(this.infectionStage=t,this.infectionTime=0);}updateInfection(t){const e=this.container.actualOptions,i=e.infection,o=e.infection.stages,s=o.length;if(void 0!==this.infectionDelay&&void 0!==this.infectionDelayStage){const e=this.infectionDelayStage;if(e>s||e<0)return;this.infectionDelay>1e3*i.delay?(this.infectionStage=e,this.infectionTime=0,delete this.infectionDelay,delete this.infectionDelayStage):this.infectionDelay+=t;}else delete this.infectionDelay,delete this.infectionDelayStage;if(void 0!==this.infectionStage&&void 0!==this.infectionTime){const e=o[this.infectionStage];void 0!==e.duration&&e.duration>=0&&this.infectionTime>1e3*e.duration?this.nextInfectionStage():this.infectionTime+=t;}else delete this.infectionStage,delete this.infectionTime;}nextInfectionStage(){const t=this.container.actualOptions,e=t.infection.stages.length;if(!(e<=0||void 0===this.infectionStage)&&(this.infectionTime=0,e<=++this.infectionStage)){if(t.infection.cure)return delete this.infectionStage,void delete this.infectionTime;this.infectionStage=0,this.infectionTime=0;}}}class be{constructor(t,e){this.container=t,this.particle=e;}move(t){const e=this.particle;e.bubble.inRange=!1,e.links=[];for(const[,i]of this.container.plugins){if(e.destroyed)break;i.particleUpdate&&i.particleUpdate(e,t);}e.destroyed||(this.moveParticle(t),this.moveParallax());}moveParticle(t){var e,i;const o=this.particle,s=o.options;if(!s.move.enable)return;const n=this.container,a=this.getProximitySpeedFactor(),r=(null!==(e=o.moveSpeed)&&void 0!==e?e:E.getRangeValue(o.options.move.speed)*n.retina.pixelRatio)*n.retina.reduceFactor,l=E.getRangeMax(o.options.size.value)*n.retina.pixelRatio,c=r/2*(s.move.size?o.getRadius()/l:1)*a*t.factor,d=null!==(i=o.moveDrift)&&void 0!==i?i:E.getRangeValue(o.options.move.drift)*n.retina.pixelRatio;this.applyPath(t);const h=s.move.gravity;h.enable&&(o.velocity.y+=h.acceleration*t.factor/(60*c)),o.velocity.x+=d*t.factor/(60*c);const u=1-o.options.move.decay;o.velocity.multTo(u);const v=o.velocity.mult(c);h.enable&&v.y>=h.maxSpeed&&h.maxSpeed>0&&(v.y=h.maxSpeed,o.velocity.y=v.y/c),o.position.addTo(v),s.move.vibrate&&(o.position.x+=Math.sin(o.position.x*Math.cos(o.position.y)),o.position.y+=Math.cos(o.position.y*Math.sin(o.position.x)));const p=o.initialPosition,y=E.getDistance(p,o.position);o.maxDistance&&(y>=o.maxDistance&&!o.misplaced?(o.misplaced=y>o.maxDistance,o.velocity.x=o.velocity.y/2-o.velocity.x,o.velocity.y=o.velocity.x/2-o.velocity.y):y<o.maxDistance&&o.misplaced?o.misplaced=!1:o.misplaced&&((o.position.x<p.x&&o.velocity.x<0||o.position.x>p.x&&o.velocity.x>0)&&(o.velocity.x*=-Math.random()),(o.position.y<p.y&&o.velocity.y<0||o.position.y>p.y&&o.velocity.y>0)&&(o.velocity.y*=-Math.random())));}applyPath(t){const e=this.particle,i=e.options.move.path;if(!i.enable)return;const o=this.container;if(e.lastPathTime<=e.pathDelay)return void(e.lastPathTime+=t.value);let s=o.pathGenerator;if(i.generator){const t=vt.getPathGenerator(i.generator);t&&(s=t);}const n=s.generate(e);e.velocity.addTo(n),i.clamp&&(e.velocity.x=E.clamp(e.velocity.x,-1,1),e.velocity.y=E.clamp(e.velocity.y,-1,1)),e.lastPathTime-=e.pathDelay;}moveParallax(){const t=this.container,e=t.actualOptions;if(J.isSsr()||!e.interactivity.events.onHover.parallax.enable)return;const i=this.particle,o=e.interactivity.events.onHover.parallax.force,s=t.interactivity.mouse.position;if(!s)return;const n=t.canvas.size.width/2,a=t.canvas.size.height/2,r=e.interactivity.events.onHover.parallax.smooth,l=i.getRadius()/o,c=(s.x-n)*l,d=(s.y-a)*l;i.offset.x+=(c-i.offset.x)/r,i.offset.y+=(d-i.offset.y)/r;}getProximitySpeedFactor(){const t=this.container,e=t.actualOptions;if(!J.isInArray(F.slow,e.interactivity.events.onHover.mode))return 1;const i=this.container.interactivity.mouse.position;if(!i)return 1;const o=this.particle.getPosition(),s=E.getDistance(i,o),n=t.retina.slowModeRadius;if(s>n)return 1;return (s/n||0)/e.interactivity.modes.slow.factor}}class we{constructor(t,e,i,o){var s,n,a,r,l,c,d,h,u;this.id=t,this.container=e,this.links=[],this.fill=!0,this.close=!0,this.lastPathTime=0,this.destroyed=!1,this.unbreakable=!1,this.splitCount=0,this.misplaced=!1,this.loops={opacity:0,size:0};const v=e.retina.pixelRatio,p=e.actualOptions,y=new me;y.load(p.particles);const f=y.shape.type,m=y.reduceDuplicates;if(this.shape=f instanceof Array?J.itemFromArray(f,this.id,m):f,null==o?void 0:o.shape){if(o.shape.type){const t=o.shape.type;this.shape=t instanceof Array?J.itemFromArray(t,this.id,m):t;}const t=new Yt;if(t.load(o.shape),this.shape){const e=t.options[this.shape];e&&(this.shapeData=J.deepExtend({},e instanceof Array?J.itemFromArray(e,this.id,m):e));}}else {const t=y.shape.options[this.shape];t&&(this.shapeData=J.deepExtend({},t instanceof Array?J.itemFromArray(t,this.id,m):t));}void 0!==o&&y.load(o),void 0!==(null===(s=this.shapeData)||void 0===s?void 0:s.particles)&&y.load(null===(n=this.shapeData)||void 0===n?void 0:n.particles),this.fill=null!==(r=null===(a=this.shapeData)||void 0===a?void 0:a.fill)&&void 0!==r?r:this.fill,this.close=null!==(c=null===(l=this.shapeData)||void 0===l?void 0:l.close)&&void 0!==c?c:this.close,this.options=y,this.pathDelay=1e3*E.getValue(this.options.move.path.delay),e.retina.initParticle(this);const g=this.options.color,b=this.options.size,w=E.getValue(b)*e.retina.pixelRatio,x="boolean"==typeof b.random?b.random:b.random.enable;this.size={value:w},this.direction=this.options.move.direction,this.bubble={inRange:!1},this.initialVelocity=this.calculateVelocity(),this.velocity=this.initialVelocity.copy();const k=this.options.rotate;this.rotate={value:E.getRangeValue(k.value)*Math.PI/180};let P=k.direction;if(P===A.random){P=Math.floor(2*Math.random())>0?A.counterClockwise:A.clockwise;}switch(P){case A.counterClockwise:case"counterClockwise":this.rotate.status=q.decreasing;break;case A.clockwise:this.rotate.status=q.increasing;}const M=this.options.rotate.animation;M.enable&&(this.rotate.velocity=M.speed/360*e.retina.reduceFactor,M.sync||(this.rotate.velocity*=Math.random()));const R=this.options.size.animation;if(R.enable){if(this.size.status=q.increasing,!x)switch(R.startValue){case G.min:this.size.value=R.minimumValue*v;break;case G.random:this.size.value=E.randomInRange(E.setRangeValue(R.minimumValue*v,this.size.value));break;case G.max:default:this.size.status=q.decreasing;}this.size.velocity=(null!==(d=this.sizeAnimationSpeed)&&void 0!==d?d:e.retina.sizeAnimationSpeed)/100*e.retina.reduceFactor,R.sync||(this.size.velocity*=Math.random());}const S=tt.colorToHsl(g,this.id,m);if(S){this.color={h:{value:S.h},s:{value:S.s},l:{value:S.l}};const t=this.options.color.animation;this.setColorAnimation(t.h,this.color.h),this.setColorAnimation(t.s,this.color.s),this.setColorAnimation(t.l,this.color.l);}this.position=this.calcPosition(this.container,i),this.initialPosition=this.position.copy(),this.offset=T.create(0,0);const C=this.options.opacity,z="boolean"==typeof C.random?C.random:C.random.enable;this.opacity={value:E.getValue(C)};const D=C.animation;if(D.enable){if(this.opacity.status=q.increasing,!z)switch(D.startValue){case G.min:this.opacity.value=D.minimumValue;break;case G.random:this.opacity.value=E.randomInRange(E.setRangeValue(D.minimumValue,this.opacity.value));break;case G.max:default:this.opacity.status=q.decreasing;}this.opacity.velocity=D.speed/100*e.retina.reduceFactor,D.sync||(this.opacity.velocity*=Math.random());}this.sides=24;let O=e.drawers.get(this.shape);O||(O=vt.getShapeDrawer(this.shape),O&&e.drawers.set(this.shape,O));const I=null==O?void 0:O.getSidesCount;I&&(this.sides=I(this));const F=this.loadImageShape(e,O);F&&(this.image=F.image,this.fill=F.fill,this.close=F.close),this.stroke=this.options.stroke instanceof Array?J.itemFromArray(this.options.stroke,this.id,m):this.options.stroke,this.strokeWidth=this.stroke.width*e.retina.pixelRatio;const L=null!==(h=tt.colorToHsl(this.stroke.color))&&void 0!==h?h:this.getFillColor();if(L){this.strokeColor={h:{value:L.h},s:{value:L.s},l:{value:L.l}};const t=null===(u=this.stroke.color)||void 0===u?void 0:u.animation;t&&this.strokeColor&&(this.setColorAnimation(t.h,this.strokeColor.h),this.setColorAnimation(t.s,this.strokeColor.s),this.setColorAnimation(t.l,this.strokeColor.l));}const V=y.life;this.lifeDelay=e.retina.reduceFactor?E.getValue(V.delay)*(V.delay.sync?1:Math.random())/e.retina.reduceFactor*1e3:0,this.lifeDelayTime=0,this.lifeDuration=e.retina.reduceFactor?E.getValue(V.duration)*(V.duration.sync?1:Math.random())/e.retina.reduceFactor*1e3:0,this.lifeTime=0,this.livesRemaining=y.life.count,this.spawning=this.lifeDelay>0,this.lifeDuration<=0&&(this.lifeDuration=-1),this.livesRemaining<=0&&(this.livesRemaining=-1),this.shadowColor=tt.colorToRgb(this.options.shadow.color),this.updater=new zt(e,this),this.infecter=new ge(e),this.mover=new be(e,this),O&&O.particleInit&&O.particleInit(e,this);}move(t){this.mover.move(t);}update(t){this.updater.update(t);}draw(t){this.container.canvas.drawParticle(this,t);}getPosition(){return this.position.add(this.offset)}getRadius(){return this.bubble.radius||this.size.value}getMass(){const t=this.getRadius();return Math.pow(t,2)*Math.PI/2}getFillColor(){var t;return null!==(t=this.bubble.color)&&void 0!==t?t:tt.getHslFromAnimation(this.color)}getStrokeColor(){var t,e;return null!==(e=null!==(t=this.bubble.color)&&void 0!==t?t:tt.getHslFromAnimation(this.strokeColor))&&void 0!==e?e:this.getFillColor()}destroy(t){if(this.destroyed=!0,this.bubble.inRange=!1,this.links=[],this.unbreakable)return;this.destroyed=!0,this.bubble.inRange=!1;for(const[,e]of this.container.plugins)e.particleDestroyed&&e.particleDestroyed(this,t);if(t)return;this.options.destroy.mode===O.split&&this.split();}reset(){this.loops.opacity=0,this.loops.size=0;}split(){const t=this.options.destroy.split;if(t.count>=0&&this.splitCount++>t.count)return;const e=E.getRangeValue(t.rate.value);for(let t=0;t<e;t++)this.container.particles.addSplitParticle(this);}setColorAnimation(t,e){if(t.enable){if(e.velocity=t.speed/100*this.container.retina.reduceFactor,t.sync)return;e.status=q.increasing,e.velocity*=Math.random(),e.value&&(e.value*=Math.random());}else e.velocity=0;}calcPosition(t,e,i=0){var o,s;for(const[,i]of t.plugins){const t=void 0!==i.particlePosition?i.particlePosition(e,this):void 0;if(void 0!==t)return T.create(t.x,t.y)}const n=T.create(null!==(o=null==e?void 0:e.x)&&void 0!==o?o:Math.random()*t.canvas.size.width,null!==(s=null==e?void 0:e.y)&&void 0!==s?s:Math.random()*t.canvas.size.height),a=this.options.move.outMode;return (J.isInArray(a,V.bounce)||J.isInArray(a,V.bounceHorizontal))&&(n.x>t.canvas.size.width-2*this.size.value?n.x-=this.size.value:n.x<2*this.size.value&&(n.x+=this.size.value)),(J.isInArray(a,V.bounce)||J.isInArray(a,V.bounceVertical))&&(n.y>t.canvas.size.height-2*this.size.value?n.y-=this.size.value:n.y<2*this.size.value&&(n.y+=this.size.value)),this.checkOverlap(n,i)?this.calcPosition(t,void 0,i+1):n}checkOverlap(t,e=0){const i=this.options.collisions.overlap;if(!i.enable){const o=i.retries;if(o>=0&&e>o)throw new Error("Particle is overlapping and can't be placed");let s=!1;for(const e of this.container.particles.array)if(E.getDistance(t,e.position)<this.size.value+e.size.value){s=!0;break}return s}return !1}calculateVelocity(){const t=E.getParticleBaseVelocity(this.direction).copy(),e=this.options.move;let i,o=Math.PI/4;"number"==typeof e.angle?i=Math.PI/180*e.angle:(i=Math.PI/180*e.angle.value,o=Math.PI/180*e.angle.offset);const s={left:Math.sin(o+i/2)-Math.sin(o-i/2),right:Math.cos(o+i/2)-Math.cos(o-i/2)};return e.straight&&!e.random||(t.x+=E.randomInRange(E.setRangeValue(s.left,s.right))/2,t.y+=E.randomInRange(E.setRangeValue(s.left,s.right))/2),t}loadImageShape(t,e){var i,o,s,n,a;if(this.shape!==W.image&&this.shape!==W.images)return;const r=e.getImages(t).images,l=this.shapeData,c=null!==(i=r.find((t=>t.source===l.src)))&&void 0!==i?i:r[0],d=this.getFillColor();let h;if(!c)return;if(void 0!==c.svgData&&l.replaceColor&&d){const t=tt.replaceColorSvg(c,d,this.opacity.value),e=new Blob([t],{type:"image/svg+xml"}),i=URL||window.URL||window.webkitURL||window,s=i.createObjectURL(e),n=new Image;h={data:c,loaded:!1,ratio:l.width/l.height,replaceColor:null!==(o=l.replaceColor)&&void 0!==o?o:l.replace_color,source:l.src},n.addEventListener("load",(()=>{this.image&&(this.image.loaded=!0,c.element=n),i.revokeObjectURL(s);})),n.addEventListener("error",(()=>{i.revokeObjectURL(s),J.loadImage(l.src).then((t=>{this.image&&t&&(c.element=t.element,this.image.loaded=!0);}));})),n.src=s;}else h={data:c,loaded:!0,ratio:l.width/l.height,replaceColor:null!==(s=l.replaceColor)&&void 0!==s?s:l.replace_color,source:l.src};h.ratio||(h.ratio=1);return {image:h,fill:null!==(n=l.fill)&&void 0!==n?n:this.fill,close:null!==(a=l.close)&&void 0!==a?a:this.close}}}class xe{constructor(t){this.container=t;}isEnabled(){const t=this.container,e=t.interactivity.mouse,i=t.actualOptions.interactivity.events;if(!i.onHover.enable||!e.position)return !1;const o=i.onHover.mode;return J.isInArray(F.grab,o)}reset(){}interact(){var t;const e=this.container,i=e.actualOptions.interactivity;if(i.events.onHover.enable&&e.interactivity.status===Q.mouseMoveEvent){const o=e.interactivity.mouse.position;if(void 0===o)return;const s=e.retina.grabModeDistance,n=e.particles.quadTree.queryCircle(o,s);for(const a of n){const n=a.getPosition(),r=E.getDistance(n,o);if(r<=s){const n=i.modes.grab.links,l=n.opacity,c=l-r*l/s;if(c>0){const i=null!==(t=n.color)&&void 0!==t?t:a.options.links.color;if(!e.particles.grabLineColor){const t=e.actualOptions.interactivity.modes.grab.links;e.particles.grabLineColor=tt.getLinkRandomColor(i,t.blink,t.consent);}const s=tt.getLinkColor(a,void 0,e.particles.grabLineColor);if(void 0===s)return;e.canvas.drawGrabLine(a,s,c,o);}}}}}}class ke{constructor(t){this.container=t;}isEnabled(){const t=this.container,e=t.actualOptions,i=t.interactivity.mouse,o=e.interactivity.events,s=o.onDiv,n=J.isDivModeEnabled(I.repulse,s);if(!(n||o.onHover.enable&&i.position||o.onClick.enable&&i.clickPosition))return !1;const a=o.onHover.mode,r=o.onClick.mode;return J.isInArray(F.repulse,a)||J.isInArray(D.repulse,r)||n}reset(){}interact(){const t=this.container,e=t.actualOptions,i=t.interactivity.status===Q.mouseMoveEvent,o=e.interactivity.events,s=o.onHover.enable,n=o.onHover.mode,a=o.onClick.enable,r=o.onClick.mode,l=o.onDiv;i&&s&&J.isInArray(F.repulse,n)?this.hoverRepulse():a&&J.isInArray(D.repulse,r)?this.clickRepulse():J.divModeExecute(I.repulse,l,((t,e)=>this.singleSelectorRepulse(t,e)));}singleSelectorRepulse(t,e){const i=this.container,o=document.querySelectorAll(t);o.length&&o.forEach((t=>{const o=t,s=i.retina.pixelRatio,n={x:(o.offsetLeft+o.offsetWidth/2)*s,y:(o.offsetTop+o.offsetHeight/2)*s},a=o.offsetWidth/2*s,r=e.type===N.circle?new st(n.x,n.y,a):new nt(o.offsetLeft*s,o.offsetTop*s,o.offsetWidth*s,o.offsetHeight*s),l=i.actualOptions.interactivity.modes.repulse.divs,c=J.divMode(l,o);this.processRepulse(n,a,r,c);}));}hoverRepulse(){const t=this.container,e=t.interactivity.mouse.position;if(!e)return;const i=t.retina.repulseModeDistance;this.processRepulse(e,i,new st(e.x,e.y,i));}processRepulse(t,e,i,o){var s;const n=this.container,a=n.particles.quadTree.query(i);for(const i of a){const{dx:a,dy:r,distance:l}=E.getDistances(i.position,t),c={x:a/l,y:r/l},d=100*(null!==(s=null==o?void 0:o.speed)&&void 0!==s?s:n.actualOptions.interactivity.modes.repulse.speed),h=E.clamp((1-Math.pow(l/e,2))*d,0,50);i.position.x+=c.x*h,i.position.y+=c.y*h;}}clickRepulse(){const t=this.container;if(t.repulse.finish||(t.repulse.count||(t.repulse.count=0),t.repulse.count++,t.repulse.count===t.particles.count&&(t.repulse.finish=!0)),t.repulse.clicking){const e=t.retina.repulseModeDistance,i=Math.pow(e/6,3),o=t.interactivity.mouse.clickPosition;if(void 0===o)return;const s=new st(o.x,o.y,i),n=t.particles.quadTree.query(s);for(const e of n){const{dx:s,dy:n,distance:a}=E.getDistances(o,e.position),r=a*a;if(r<=i){t.repulse.particles.push(e);const o=t.actualOptions.interactivity.modes.repulse.speed,a=T.create(s,n);a.length=-i*o/r,e.velocity.setTo(a);}}}else if(!1===t.repulse.clicking){for(const e of t.repulse.particles)e.velocity.setTo(e.initialVelocity);t.repulse.particles=[];}}}function Pe(t,e,i,o){if(e>i){const s=t+(e-i)*o;return E.clamp(s,t,e)}if(e<i){const s=t-(i-e)*o;return E.clamp(s,e,t)}}class Me{constructor(t){this.container=t;}isEnabled(){const t=this.container,e=t.actualOptions,i=t.interactivity.mouse,o=e.interactivity.events,s=o.onDiv,n=J.isDivModeEnabled(I.bubble,s);if(!(n||o.onHover.enable&&i.position||o.onClick.enable&&i.clickPosition))return !1;const a=o.onHover.mode,r=o.onClick.mode;return J.isInArray(F.bubble,a)||J.isInArray(D.bubble,r)||n}reset(t,e){t.bubble.inRange&&!e||(delete t.bubble.div,delete t.bubble.opacity,delete t.bubble.radius,delete t.bubble.color);}interact(){const t=this.container.actualOptions.interactivity.events,e=t.onHover,i=t.onClick,o=e.enable,s=e.mode,n=i.enable,a=i.mode,r=t.onDiv;o&&J.isInArray(F.bubble,s)?this.hoverBubble():n&&J.isInArray(D.bubble,a)?this.clickBubble():J.divModeExecute(I.bubble,r,((t,e)=>this.singleSelectorHover(t,e)));}singleSelectorHover(t,e){const i=this.container,o=document.querySelectorAll(t);o.length&&o.forEach((t=>{const o=t,s=i.retina.pixelRatio,n={x:(o.offsetLeft+o.offsetWidth/2)*s,y:(o.offsetTop+o.offsetHeight/2)*s},a=o.offsetWidth/2*s,r=e.type===N.circle?new st(n.x,n.y,a):new nt(o.offsetLeft*s,o.offsetTop*s,o.offsetWidth*s,o.offsetHeight*s),l=i.particles.quadTree.query(r);for(const t of l){if(!r.contains(t.getPosition()))continue;t.bubble.inRange=!0;const e=i.actualOptions.interactivity.modes.bubble.divs,s=J.divMode(e,o);t.bubble.div&&t.bubble.div===o||(this.reset(t,!0),t.bubble.div=o),this.hoverBubbleSize(t,1,s),this.hoverBubbleOpacity(t,1,s),this.hoverBubbleColor(t,s);}}));}process(t,e,i,o){const s=this.container,n=o.bubbleObj.optValue;if(void 0===n)return;const a=s.actualOptions.interactivity.modes.bubble.duration,r=s.retina.bubbleModeDistance,l=o.particlesObj.optValue,c=o.bubbleObj.value,d=o.particlesObj.value||0,h=o.type;if(n!==l)if(s.bubble.durationEnd)c&&(h===$.size&&delete t.bubble.radius,h===$.opacity&&delete t.bubble.opacity);else if(e<=r){if((null!=c?c:d)!==n){const e=d-i*(d-n)/a;h===$.size&&(t.bubble.radius=e),h===$.opacity&&(t.bubble.opacity=e);}}else h===$.size&&delete t.bubble.radius,h===$.opacity&&delete t.bubble.opacity;}clickBubble(){const t=this.container,e=t.actualOptions,i=t.interactivity.mouse.clickPosition;if(void 0===i)return;const o=t.retina.bubbleModeDistance,s=t.particles.quadTree.queryCircle(i,o);for(const o of s){if(!t.bubble.clicking)continue;o.bubble.inRange=!t.bubble.durationEnd;const s=o.getPosition(),n=E.getDistance(s,i),a=((new Date).getTime()-(t.interactivity.mouse.clickTime||0))/1e3;a>e.interactivity.modes.bubble.duration&&(t.bubble.durationEnd=!0),a>2*e.interactivity.modes.bubble.duration&&(t.bubble.clicking=!1,t.bubble.durationEnd=!1);const r={bubbleObj:{optValue:t.retina.bubbleModeSize,value:o.bubble.radius},particlesObj:{optValue:E.getRangeMax(o.options.size.value)*t.retina.pixelRatio,value:o.size.value},type:$.size};this.process(o,n,a,r);const l={bubbleObj:{optValue:e.interactivity.modes.bubble.opacity,value:o.bubble.opacity},particlesObj:{optValue:E.getRangeMax(o.options.opacity.value),value:o.opacity.value},type:$.opacity};this.process(o,n,a,l),t.bubble.durationEnd?delete o.bubble.color:n<=t.retina.bubbleModeDistance?this.hoverBubbleColor(o):delete o.bubble.color;}}hoverBubble(){const t=this.container,e=t.interactivity.mouse.position;if(void 0===e)return;const i=t.retina.bubbleModeDistance,o=t.particles.quadTree.queryCircle(e,i);for(const s of o){s.bubble.inRange=!0;const o=s.getPosition(),n=E.getDistance(o,e),a=1-n/i;n<=i?a>=0&&t.interactivity.status===Q.mouseMoveEvent&&(this.hoverBubbleSize(s,a),this.hoverBubbleOpacity(s,a),this.hoverBubbleColor(s)):this.reset(s),t.interactivity.status===Q.mouseLeaveEvent&&this.reset(s);}}hoverBubbleSize(t,e,i){const o=this.container,s=(null==i?void 0:i.size)?i.size*o.retina.pixelRatio:o.retina.bubbleModeSize;if(void 0===s)return;const n=E.getRangeMax(t.options.size.value)*o.retina.pixelRatio,a=Pe(t.size.value,s,n,e);void 0!==a&&(t.bubble.radius=a);}hoverBubbleOpacity(t,e,i){var o;const s=this.container.actualOptions,n=null!==(o=null==i?void 0:i.opacity)&&void 0!==o?o:s.interactivity.modes.bubble.opacity;if(void 0===n)return;const a=t.options.opacity.value,r=Pe(t.opacity.value,n,E.getRangeMax(a),e);void 0!==r&&(t.bubble.opacity=r);}hoverBubbleColor(t,e){var i;const o=this.container.actualOptions;if(void 0===t.bubble.color){const s=null!==(i=null==e?void 0:e.color)&&void 0!==i?i:o.interactivity.modes.bubble.color;if(void 0===s)return;const n=s instanceof Array?J.itemFromArray(s):s;t.bubble.color=tt.colorToHsl(n);}}}class Re{constructor(t){this.container=t;}isEnabled(){const t=this.container,e=t.interactivity.mouse,i=t.actualOptions.interactivity.events;if(!i.onHover.enable||!e.position)return !1;const o=i.onHover.mode;return J.isInArray(F.connect,o)}reset(){}interact(){const t=this.container;if(t.actualOptions.interactivity.events.onHover.enable&&"mousemove"===t.interactivity.status){const e=t.interactivity.mouse.position;if(!e)return;const i=Math.abs(t.retina.connectModeRadius),o=t.particles.quadTree.queryCircle(e,i);let s=0;for(const e of o){const i=e.getPosition();for(const n of o.slice(s+1)){const o=n.getPosition(),s=Math.abs(t.retina.connectModeDistance),a=Math.abs(i.x-o.x),r=Math.abs(i.y-o.y);a<s&&r<s&&t.canvas.drawConnectLine(e,n);}++s;}}}}class Se{constructor(t){this.container=t;}isEnabled(t){return t.options.links.enable}reset(){}interact(t){var e;const i=this.container,o=t.options.links,s=o.opacity,n=null!==(e=t.linksDistance)&&void 0!==e?e:i.retina.linksDistance,a=i.canvas.size,r=o.warp,l=t.getPosition(),c=r?new at(l.x,l.y,n,a):new st(l.x,l.y,n),d=i.particles.quadTree.query(c);for(const e of d){const c=e.options.links;if(t===e||!c.enable||o.id!==c.id||e.spawning||e.destroyed)continue;const d=e.getPosition();let h=E.getDistance(l,d);if(r&&h>n){const t={x:d.x-a.width,y:d.y};if(h=E.getDistance(l,t),h>n){const t={x:d.x-a.width,y:d.y-a.height};if(h=E.getDistance(l,t),h>n){const t={x:d.x,y:d.y-a.height};h=E.getDistance(l,t);}}}if(h>n)return;const u=(1-h/n)*s,v=t.options.links;let p=void 0!==v.id?i.particles.linksColors.get(v.id):i.particles.linksColor;if(!p){const t=v.color;p=tt.getLinkRandomColor(t,v.blink,v.consent),void 0!==v.id?i.particles.linksColors.set(v.id,p):i.particles.linksColor=p;}-1===e.links.map((t=>t.destination)).indexOf(t)&&-1===t.links.map((t=>t.destination)).indexOf(e)&&t.links.push({destination:e,opacity:u});}}}class Ce{constructor(t){this.container=t;}interact(t){var e;const i=this.container,o=null!==(e=t.linksDistance)&&void 0!==e?e:i.retina.linksDistance,s=t.getPosition(),n=i.particles.quadTree.queryCircle(s,o);for(const e of n){if(t===e||!e.options.move.attract.enable||e.destroyed||e.spawning)continue;const i=e.getPosition(),{dx:o,dy:n}=E.getDistances(s,i),a=t.options.move.attract.rotate,r=o/(1e3*a.x),l=n/(1e3*a.y);t.velocity.x-=r,t.velocity.y-=l,e.velocity.x+=r,e.velocity.y+=l;}}isEnabled(t){return t.options.move.attract.enable}reset(){}}class ze{constructor(t){this.container=t;}isEnabled(t){return t.options.collisions.enable}reset(){}interact(t){const e=this.container,i=t.getPosition(),o=e.particles.quadTree.queryCircle(i,2*t.getRadius());for(const e of o){if(t===e||!e.options.collisions.enable||t.options.collisions.mode!==e.options.collisions.mode||e.destroyed||e.spawning)continue;const o=e.getPosition();E.getDistance(i,o)<=t.getRadius()+e.getRadius()&&this.resolveCollision(t,e);}}resolveCollision(t,e){switch(t.options.collisions.mode){case L.absorb:this.absorb(t,e);break;case L.bounce:!function(t,e){J.circleBounce(J.circleBounceDataFromParticle(t),J.circleBounceDataFromParticle(e));}(t,e);break;case L.destroy:!function(t,e){void 0===t.getRadius()&&void 0!==e.getRadius()?t.destroy():void 0!==t.getRadius()&&void 0===e.getRadius()?e.destroy():void 0!==t.getRadius()&&void 0!==e.getRadius()&&(t.getRadius()>=e.getRadius()?e.destroy():t.destroy());}(t,e);}}absorb(t,e){const i=this.container,o=i.actualOptions.fpsLimit/1e3;if(void 0===t.getRadius()&&void 0!==e.getRadius())t.destroy();else if(void 0!==t.getRadius()&&void 0===e.getRadius())e.destroy();else if(void 0!==t.getRadius()&&void 0!==e.getRadius())if(t.getRadius()>=e.getRadius()){const s=E.clamp(t.getRadius()/e.getRadius(),0,e.getRadius())*o;t.size.value+=s,e.size.value-=s,e.getRadius()<=i.retina.pixelRatio&&(e.size.value=0,e.destroy());}else {const s=E.clamp(e.getRadius()/t.getRadius(),0,t.getRadius())*o;t.size.value-=s,e.size.value+=s,t.getRadius()<=i.retina.pixelRatio&&(t.size.value=0,t.destroy());}}}class Ae{constructor(t){this.container=t;}isEnabled(){return this.container.actualOptions.infection.enable}reset(){}interact(t,e){var i,o;const s=t.infecter;if(s.updateInfection(e.value),void 0===s.infectionStage)return;const n=this.container,a=n.actualOptions.infection;if(!a.enable||a.stages.length<1)return;const r=a.stages[s.infectionStage],l=n.retina.pixelRatio,c=2*t.getRadius()+r.radius*l,d=t.getPosition(),h=null!==(i=r.infectedStage)&&void 0!==i?i:s.infectionStage,u=n.particles.quadTree.queryCircle(d,c),v=r.rate,p=u.length;for(const e of u){if(e===t||e.destroyed||e.spawning||void 0!==e.infecter.infectionStage&&e.infecter.infectionStage===s.infectionStage)continue;const i=e.infecter;if(Math.random()<v/p)if(void 0===i.infectionStage)i.startInfection(h);else if(i.infectionStage<s.infectionStage)i.updateInfectionStage(h);else if(i.infectionStage>s.infectionStage){const t=a.stages[i.infectionStage],e=null!==(o=null==t?void 0:t.infectedStage)&&void 0!==o?o:i.infectionStage;s.updateInfectionStage(e);}}}}class Te{constructor(t){this.container=t,this.delay=0;}interact(t){if(!this.container.retina.reduceFactor)return;const e=this.container,i=e.actualOptions.interactivity.modes.trail,o=1e3*i.delay/this.container.retina.reduceFactor;this.delay<o&&(this.delay+=t.value),this.delay>=o&&(e.particles.push(i.quantity,e.interactivity.mouse,i.particles),this.delay-=o);}isEnabled(){const t=this.container,e=t.actualOptions,i=t.interactivity.mouse,o=e.interactivity.events;return i.clicking&&i.inside&&!!i.position&&J.isInArray(D.trail,o.onClick.mode)||i.inside&&!!i.position&&J.isInArray(F.trail,o.onHover.mode)}reset(){}}class Ee{constructor(t){this.container=t;}isEnabled(){const t=this.container,e=t.actualOptions,i=t.interactivity.mouse,o=e.interactivity.events;if(!(o.onHover.enable&&i.position||o.onClick.enable&&i.clickPosition))return !1;const s=o.onHover.mode,n=o.onClick.mode;return J.isInArray(F.attract,s)||J.isInArray(D.attract,n)}reset(){}interact(){const t=this.container,e=t.actualOptions,i=t.interactivity.status===Q.mouseMoveEvent,o=e.interactivity.events,s=o.onHover.enable,n=o.onHover.mode,a=o.onClick.enable,r=o.onClick.mode;i&&s&&J.isInArray(F.attract,n)?this.hoverAttract():a&&J.isInArray(D.attract,r)&&this.clickAttract();}hoverAttract(){const t=this.container,e=t.interactivity.mouse.position;if(!e)return;const i=t.retina.attractModeDistance;this.processAttract(e,i,new st(e.x,e.y,i));}processAttract(t,e,i){const o=this.container,s=o.particles.quadTree.query(i);for(const i of s){const{dx:s,dy:n,distance:a}=E.getDistances(i.position,t),r={x:s/a,y:n/a},l=o.actualOptions.interactivity.modes.attract.speed,c=E.clamp((1-Math.pow(a/e,2))*l,0,50);i.position.x-=r.x*c,i.position.y-=r.y*c;}}clickAttract(){const t=this.container;if(t.attract.finish||(t.attract.count||(t.attract.count=0),t.attract.count++,t.attract.count===t.particles.count&&(t.attract.finish=!0)),t.attract.clicking){const e=t.interactivity.mouse.clickPosition;if(!e)return;const i=t.retina.attractModeDistance;this.processAttract(e,i,new st(e.x,e.y,i));}else !1===t.attract.clicking&&(t.attract.particles=[]);}}class De{constructor(t){this.container=t;}interact(t){const e=this.container;if(e.actualOptions.interactivity.events.onHover.enable&&"mousemove"===e.interactivity.status){const i=this.container.interactivity.mouse.position;i&&e.canvas.drawParticleShadow(t,i);}}isEnabled(){const t=this.container,e=t.interactivity.mouse,i=t.actualOptions.interactivity.events;if(!i.onHover.enable||!e.position)return !1;const o=i.onHover.mode;return J.isInArray(F.light,o)}reset(){}}class Oe{constructor(t){this.container=t;}interact(){const t=this.container;if(t.actualOptions.interactivity.events.onHover.enable&&"mousemove"===t.interactivity.status){const e=t.interactivity.mouse.position;if(!e)return;t.canvas.drawLight(e);}}isEnabled(){const t=this.container,e=t.interactivity.mouse,i=t.actualOptions.interactivity.events;if(!i.onHover.enable||!e.position)return !1;const o=i.onHover.mode;return J.isInArray(F.light,o)}reset(){}}class Ie{constructor(t){this.container=t;}isEnabled(){const t=this.container,e=t.actualOptions,i=t.interactivity.mouse,o=e.interactivity.events,s=o.onDiv;return i.position&&o.onHover.enable&&J.isInArray(F.bounce,o.onHover.mode)||J.isDivModeEnabled(I.bounce,s)}interact(){const t=this.container,e=t.actualOptions.interactivity.events,i=t.interactivity.status===Q.mouseMoveEvent,o=e.onHover.enable,s=e.onHover.mode,n=e.onDiv;i&&o&&J.isInArray(F.bounce,s)?this.processMouseBounce():J.divModeExecute(I.bounce,n,((t,e)=>this.singleSelectorBounce(t,e)));}reset(){}processMouseBounce(){const t=this.container,e=10*t.retina.pixelRatio,i=t.interactivity.mouse.position,o=t.retina.bounceModeDistance;i&&this.processBounce(i,o,new st(i.x,i.y,o+e));}singleSelectorBounce(t,e){const i=this.container,o=document.querySelectorAll(t);o.length&&o.forEach((t=>{const o=t,s=i.retina.pixelRatio,n={x:(o.offsetLeft+o.offsetWidth/2)*s,y:(o.offsetTop+o.offsetHeight/2)*s},a=o.offsetWidth/2*s,r=10*s,l=e.type===N.circle?new st(n.x,n.y,a+r):new nt(o.offsetLeft*s-r,o.offsetTop*s-r,o.offsetWidth*s+2*r,o.offsetHeight*s+2*r);this.processBounce(n,a,l);}));}processBounce(t,e,i){const o=this.container.particles.quadTree.query(i);for(const s of o)i instanceof st?J.circleBounce(J.circleBounceDataFromParticle(s),{position:t,radius:e,mass:Math.pow(e,2)*Math.PI/2,velocity:T.create(0,0),factor:{horizontal:0,vertical:0}}):i instanceof nt&&J.rectBounce(s,J.calculateBounds(t,e));}}class Fe{constructor(t){this.container=t,this.externalInteractors=[new Ie(t),new Me(t),new Re(t),new xe(t),new Oe(t),new Ee(t),new ke(t),new Te(t)],this.particleInteractors=[new Ce(t),new De(t),new ze(t),new Ae(t),new Se(t)];}init(){}externalInteract(t){for(const e of this.externalInteractors)e.isEnabled()&&e.interact(t);}particlesInteract(t,e){for(const e of this.externalInteractors)e.reset(t);for(const i of this.particleInteractors)i.isEnabled(t)&&i.interact(t,e);}}class Le{constructor(t){this.container=t,this.nextId=0,this.array=[],this.limit=0,this.linksFreq=new Map,this.trianglesFreq=new Map,this.interactionManager=new Fe(t);const e=this.container.canvas.size;this.linksColors=new Map,this.quadTree=new yt(new nt(-e.width/4,-e.height/4,3*e.width/2,3*e.height/2),4);}get count(){return this.array.length}init(){const t=this.container,e=t.actualOptions;this.linksFreq=new Map,this.trianglesFreq=new Map;let i=!1;for(const i of e.manualParticles){const e=i.position?{x:i.position.x*t.canvas.size.width/100,y:i.position.y*t.canvas.size.height/100}:void 0;this.addParticle(e,i.options);}for(const[,e]of t.plugins)if(void 0!==e.particlesInitialization&&(i=e.particlesInitialization()),i)break;if(!i)for(let t=this.count;t<e.particles.number.value;t++)this.addParticle();if(e.infection.enable)for(let t=0;t<e.infection.infections;t++){const t=this.array.filter((t=>void 0===t.infecter.infectionStage));J.itemFromArray(t).infecter.startInfection(0);}this.interactionManager.init(),t.pathGenerator.init();}redraw(){this.clear(),this.init(),this.draw({value:0,factor:0});}removeAt(t,e,i){if(t>=0&&t<=this.count)for(const o of this.array.splice(t,null!=e?e:1))o.destroy(i);}remove(t,e){this.removeAt(this.array.indexOf(t),void 0,e);}update(t){const e=this.container,i=[];e.pathGenerator.update();for(const[,i]of e.plugins)void 0!==i.update&&i.update(t);for(const e of this.array){const o=this.container.canvas.resizeFactor;o&&(e.position.x*=o.width,e.position.y*=o.height),e.move(t),e.destroyed?i.push(e):this.quadTree.insert(new pt(e.getPosition(),e));}for(const t of i)this.remove(t);this.interactionManager.externalInteract(t);for(const e of this.container.particles.array)e.update(t),e.destroyed||e.spawning||this.interactionManager.particlesInteract(e,t);delete e.canvas.resizeFactor;}draw(t){const e=this.container;e.canvas.clear();const i=this.container.canvas.size;this.quadTree=new yt(new nt(-i.width/4,-i.height/4,3*i.width/2,3*i.height/2),4),this.update(t);for(const[,i]of e.plugins)e.canvas.drawPlugin(i,t);for(const e of this.array)e.draw(t);}clear(){this.array=[];}push(t,e,i){const o=this.container,s=o.actualOptions.particles.number.limit*o.density;if(this.pushing=!0,s>0){const e=this.count+t-s;e>0&&this.removeQuantity(e);}for(let o=0;o<t;o++)this.addParticle(null==e?void 0:e.position,i);this.pushing=!1;}addParticle(t,e){return this.pushParticle(t,e)}addSplitParticle(t){const e=t.options.destroy.split,i=new me;i.load(t.options);const o=E.getRangeValue(e.factor.value);i.color.load({value:{hsl:t.getFillColor()}}),"number"==typeof i.size.value?i.size.value/=o:(i.size.value.min/=o,i.size.value.max/=o),i.load(e.particles);const s=E.setRangeValue(-t.size.value,t.size.value),n={x:t.position.x+E.randomInRange(s),y:t.position.y+E.randomInRange(s)};return this.pushParticle(n,i,(e=>!(e.size.value<.5)&&(e.velocity.length=E.randomInRange(E.setRangeValue(t.velocity.length,e.velocity.length)),e.splitCount=t.splitCount+1,e.unbreakable=!0,setTimeout((()=>{e.unbreakable=!1;}),500),!0)))}removeQuantity(t){this.removeAt(0,t);}getLinkFrequency(t,e){const i=`${Math.min(t.id,e.id)}_${Math.max(t.id,e.id)}`;let o=this.linksFreq.get(i);return void 0===o&&(o=Math.random(),this.linksFreq.set(i,o)),o}getTriangleFrequency(t,e,i){let[o,s,n]=[t.id,e.id,i.id];o>s&&([s,o]=[o,s]),s>n&&([n,s]=[s,n]),o>n&&([n,o]=[o,n]);const a=`${o}_${s}_${n}`;let r=this.trianglesFreq.get(a);return void 0===r&&(r=Math.random(),this.trianglesFreq.set(a,r)),r}setDensity(){const t=this.container.actualOptions;this.applyDensity(t.particles);}applyDensity(t){var e;if(!(null===(e=t.number.density)||void 0===e?void 0:e.enable))return;const i=t.number,o=this.initDensityFactor(i.density),s=i.value,n=i.limit>0?i.limit:s,a=Math.min(s,n)*o,r=this.count;this.limit=i.limit*o,r<a?this.push(Math.abs(a-r),void 0,t):r>a&&this.removeQuantity(r-a);}initDensityFactor(t){const e=this.container;if(!e.canvas.element||!t.enable)return 1;const i=e.canvas.element,o=e.retina.pixelRatio;return i.width*i.height/(t.factor*o*o*t.area)}pushParticle(t,e,i){try{const o=new we(this.nextId,this.container,t,e);let s=!0;if(i&&(s=i(o)),!s)return;return this.array.push(o),this.nextId++,o}catch(t){return void console.warn(`error adding particle: ${t}`)}}}class Ve{constructor(t){this.container=t;}init(){const t=this.container,e=t.actualOptions;this.pixelRatio=!e.detectRetina||J.isSsr()?1:window.devicePixelRatio;const i=this.container.actualOptions.motion;if(i&&(i.disable||i.reduce.value))if(J.isSsr()||"undefined"==typeof matchMedia||!matchMedia)this.reduceFactor=1;else {const e=matchMedia("(prefers-reduced-motion: reduce)");if(e){this.handleMotionChange(e);const i=()=>{this.handleMotionChange(e),t.refresh().catch((()=>{}));};void 0!==e.addEventListener?e.addEventListener("change",i):void 0!==e.addListener&&e.addListener(i);}}else this.reduceFactor=1;const o=this.pixelRatio;if(t.canvas.element){const e=t.canvas.element;t.canvas.size.width=e.offsetWidth*o,t.canvas.size.height=e.offsetHeight*o;}const s=e.particles;this.linksDistance=s.links.distance*o,this.linksWidth=s.links.width*o,this.sizeAnimationSpeed=s.size.animation.speed*o;const n=e.interactivity.modes;this.connectModeDistance=n.connect.distance*o,this.connectModeRadius=n.connect.radius*o,this.grabModeDistance=n.grab.distance*o,this.repulseModeDistance=n.repulse.distance*o,this.bounceModeDistance=n.bounce.distance*o,this.attractModeDistance=n.attract.distance*o,this.slowModeRadius=n.slow.radius*o,this.bubbleModeDistance=n.bubble.distance*o,n.bubble.size&&(this.bubbleModeSize=n.bubble.size*o);}initParticle(t){const e=t.options,i=this.pixelRatio;t.linksDistance=e.links.distance*i,t.linksWidth=e.links.width*i,t.moveDrift=E.getRangeValue(e.move.drift)*i,t.moveSpeed=E.getRangeValue(e.move.speed)*i,t.sizeAnimationSpeed=e.size.animation.speed*i,t.maxDistance=e.move.distance*i;}handleMotionChange(t){const e=this.container.actualOptions;if(t.matches){const t=e.motion;this.reduceFactor=t.disable?0:t.reduce.value?1/t.reduce.factor:1;}else this.reduceFactor=1;}}class He{constructor(t){this.container=t;}nextFrame(t){try{const e=this.container;if(void 0!==e.lastFrameTime&&t<e.lastFrameTime+1e3/e.fpsLimit)return void e.draw();const i=t-e.lastFrameTime,o={value:i,factor:60*i/1e3};e.lastFrameTime=t,e.particles.draw(o),e.getAnimationStatus()&&e.draw();}catch(t){console.error("tsParticles error in animation loop",t);}}}class _e{constructor(){this.enable=!1,this.mode=[];}load(t){void 0!==t&&(void 0!==t.enable&&(this.enable=t.enable),void 0!==t.mode&&(this.mode=t.mode));}}class qe{constructor(){this.selectors=[],this.enable=!1,this.mode=[],this.type=N.circle;}get elementId(){return this.ids}set elementId(t){this.ids=t;}get el(){return this.elementId}set el(t){this.elementId=t;}get ids(){return this.selectors instanceof Array?this.selectors.map((t=>t.replace("#",""))):this.selectors.replace("#","")}set ids(t){this.selectors=t instanceof Array?t.map((t=>`#${t}`)):`#${t}`;}load(t){var e,i;if(void 0===t)return;const o=null!==(i=null!==(e=t.ids)&&void 0!==e?e:t.elementId)&&void 0!==i?i:t.el;void 0!==o&&(this.ids=o),void 0!==t.selectors&&(this.selectors=t.selectors),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.mode&&(this.mode=t.mode),void 0!==t.type&&(this.type=t.type);}}class Be{constructor(){this.enable=!1,this.force=2,this.smooth=10;}load(t){void 0!==t&&(void 0!==t.enable&&(this.enable=t.enable),void 0!==t.force&&(this.force=t.force),void 0!==t.smooth&&(this.smooth=t.smooth));}}class $e{constructor(){this.enable=!1,this.mode=[],this.parallax=new Be;}load(t){void 0!==t&&(void 0!==t.enable&&(this.enable=t.enable),void 0!==t.mode&&(this.mode=t.mode),this.parallax.load(t.parallax));}}class We{constructor(){this.onClick=new _e,this.onDiv=new qe,this.onHover=new $e,this.resize=!0;}get onclick(){return this.onClick}set onclick(t){this.onClick=t;}get ondiv(){return this.onDiv}set ondiv(t){this.onDiv=t;}get onhover(){return this.onHover}set onhover(t){this.onHover=t;}load(t){var e,i,o;if(void 0===t)return;this.onClick.load(null!==(e=t.onClick)&&void 0!==e?e:t.onclick);const s=null!==(i=t.onDiv)&&void 0!==i?i:t.ondiv;void 0!==s&&(s instanceof Array?this.onDiv=s.map((t=>{const e=new qe;return e.load(t),e})):(this.onDiv=new qe,this.onDiv.load(s))),this.onHover.load(null!==(o=t.onHover)&&void 0!==o?o:t.onhover),void 0!==t.resize&&(this.resize=t.resize);}}class Ge{constructor(){this.distance=200,this.duration=.4;}load(t){void 0!==t&&(void 0!==t.distance&&(this.distance=t.distance),void 0!==t.duration&&(this.duration=t.duration),void 0!==t.opacity&&(this.opacity=t.opacity),void 0!==t.color&&(t.color instanceof Array?this.color=t.color.map((t=>At.create(void 0,t))):(this.color instanceof Array&&(this.color=new At),this.color=At.create(this.color,t.color))),void 0!==t.size&&(this.size=t.size));}}class Ne extends Ge{constructor(){super(),this.selectors=[];}get ids(){return this.selectors instanceof Array?this.selectors.map((t=>t.replace("#",""))):this.selectors.replace("#","")}set ids(t){this.selectors=t instanceof Array?t.map((t=>`#${t}`)):`#${t}`;}load(t){super.load(t),void 0!==t&&(void 0!==t.ids&&(this.ids=t.ids),void 0!==t.selectors&&(this.selectors=t.selectors));}}class Ue extends Ge{load(t){super.load(t),void 0!==t&&void 0!==t.divs&&(t.divs instanceof Array?this.divs=t.divs.map((t=>{const e=new Ne;return e.load(t),e})):((this.divs instanceof Array||!this.divs)&&(this.divs=new Ne),this.divs.load(t.divs)));}}class je{constructor(){this.opacity=.5;}load(t){void 0!==t&&void 0!==t.opacity&&(this.opacity=t.opacity);}}class Ye{constructor(){this.distance=80,this.links=new je,this.radius=60;}get line_linked(){return this.links}set line_linked(t){this.links=t;}get lineLinked(){return this.links}set lineLinked(t){this.links=t;}load(t){var e,i;void 0!==t&&(void 0!==t.distance&&(this.distance=t.distance),this.links.load(null!==(i=null!==(e=t.links)&&void 0!==e?e:t.lineLinked)&&void 0!==i?i:t.line_linked),void 0!==t.radius&&(this.radius=t.radius));}}class Xe{constructor(){this.blink=!1,this.consent=!1,this.opacity=1;}load(t){void 0!==t&&(void 0!==t.blink&&(this.blink=t.blink),void 0!==t.color&&(this.color=At.create(this.color,t.color)),void 0!==t.consent&&(this.consent=t.consent),void 0!==t.opacity&&(this.opacity=t.opacity));}}class Je{constructor(){this.distance=100,this.links=new Xe;}get line_linked(){return this.links}set line_linked(t){this.links=t;}get lineLinked(){return this.links}set lineLinked(t){this.links=t;}load(t){var e,i;void 0!==t&&(void 0!==t.distance&&(this.distance=t.distance),this.links.load(null!==(i=null!==(e=t.links)&&void 0!==e?e:t.lineLinked)&&void 0!==i?i:t.line_linked));}}class Qe{constructor(){this.quantity=2;}get particles_nb(){return this.quantity}set particles_nb(t){this.quantity=t;}load(t){var e;if(void 0===t)return;const i=null!==(e=t.quantity)&&void 0!==e?e:t.particles_nb;void 0!==i&&(this.quantity=i);}}class Ze{constructor(){this.quantity=4;}get particles_nb(){return this.quantity}set particles_nb(t){this.quantity=t;}load(t){var e;if(void 0===t)return;const i=null!==(e=t.quantity)&&void 0!==e?e:t.particles_nb;void 0!==i&&(this.quantity=i);}}class Ke{constructor(){this.distance=200,this.duration=.4,this.speed=1;}load(t){void 0!==t&&(void 0!==t.distance&&(this.distance=t.distance),void 0!==t.duration&&(this.duration=t.duration),void 0!==t.speed&&(this.speed=t.speed));}}class ti extends Ke{constructor(){super(),this.selectors=[];}get ids(){return this.selectors instanceof Array?this.selectors.map((t=>t.replace("#",""))):this.selectors.replace("#","")}set ids(t){this.selectors=t instanceof Array?t.map((()=>`#${t}`)):`#${t}`;}load(t){super.load(t),void 0!==t&&(void 0!==t.ids&&(this.ids=t.ids),void 0!==t.selectors&&(this.selectors=t.selectors));}}class ei extends Ke{load(t){super.load(t),void 0!==(null==t?void 0:t.divs)&&(t.divs instanceof Array?this.divs=t.divs.map((t=>{const e=new ti;return e.load(t),e})):((this.divs instanceof Array||!this.divs)&&(this.divs=new ti),this.divs.load(t.divs)));}}class ii{constructor(){this.factor=3,this.radius=200;}get active(){return !1}set active(t){}load(t){void 0!==t&&(void 0!==t.factor&&(this.factor=t.factor),void 0!==t.radius&&(this.radius=t.radius));}}class oi{constructor(){this.delay=1,this.quantity=1;}load(t){void 0!==t&&(void 0!==t.delay&&(this.delay=t.delay),void 0!==t.quantity&&(this.quantity=t.quantity),void 0!==t.particles&&(this.particles=J.deepExtend({},t.particles)));}}class si{constructor(){this.distance=200,this.duration=.4,this.speed=1;}load(t){void 0!==t&&(void 0!==t.distance&&(this.distance=t.distance),void 0!==t.duration&&(this.duration=t.duration),void 0!==t.speed&&(this.speed=t.speed));}}class ni{constructor(){this.start=new At,this.stop=new At,this.start.value="#ffffff",this.stop.value="#000000";}load(t){void 0!==t&&(this.start=At.create(this.start,t.start),this.stop=At.create(this.stop,t.stop));}}class ai{constructor(){this.gradient=new ni,this.radius=1e3;}load(t){void 0!==t&&(this.gradient.load(t.gradient),void 0!==t.radius&&(this.radius=t.radius));}}class ri{constructor(){this.color=new At,this.color.value="#000000",this.length=2e3;}load(t){void 0!==t&&(this.color=At.create(this.color,t.color),void 0!==t.length&&(this.length=t.length));}}class li{constructor(){this.area=new ai,this.shadow=new ri;}load(t){void 0!==t&&(this.area.load(t.area),this.shadow.load(t.shadow));}}class ci{constructor(){this.distance=200;}load(t){t&&void 0!==t.distance&&(this.distance=t.distance);}}class di{constructor(){this.attract=new si,this.bounce=new ci,this.bubble=new Ue,this.connect=new Ye,this.grab=new Je,this.light=new li,this.push=new Ze,this.remove=new Qe,this.repulse=new ei,this.slow=new ii,this.trail=new oi;}load(t){void 0!==t&&(this.attract.load(t.attract),this.bubble.load(t.bubble),this.connect.load(t.connect),this.grab.load(t.grab),this.light.load(t.light),this.push.load(t.push),this.remove.load(t.remove),this.repulse.load(t.repulse),this.slow.load(t.slow),this.trail.load(t.trail));}}class hi{constructor(){this.detectsOn=U.canvas,this.events=new We,this.modes=new di;}get detect_on(){return this.detectsOn}set detect_on(t){this.detectsOn=t;}load(t){var e,i,o;if(void 0===t)return;const s=null!==(e=t.detectsOn)&&void 0!==e?e:t.detect_on;void 0!==s&&(this.detectsOn=s),this.events.load(t.events),this.modes.load(t.modes),!0===(null===(o=null===(i=t.modes)||void 0===i?void 0:i.slow)||void 0===o?void 0:o.active)&&(this.events.onHover.mode instanceof Array?this.events.onHover.mode.indexOf(F.slow)<0&&this.events.onHover.mode.push(F.slow):this.events.onHover.mode!==F.slow&&(this.events.onHover.mode=[this.events.onHover.mode,F.slow]));}}class ui{constructor(){this.color=new At,this.opacity=1;}load(t){void 0!==t&&(void 0!==t.color&&(this.color=At.create(this.color,t.color)),void 0!==t.opacity&&(this.opacity=t.opacity));}}class vi{constructor(){this.composite="destination-out",this.cover=new ui,this.enable=!1;}load(t){if(void 0!==t){if(void 0!==t.composite&&(this.composite=t.composite),void 0!==t.cover){const e=t.cover,i="string"==typeof t.cover?{color:t.cover}:t.cover;this.cover.load(void 0!==e.color?e:{color:i});}void 0!==t.enable&&(this.enable=t.enable);}}}class pi{constructor(){this.color=new At,this.color.value="",this.image="",this.position="",this.repeat="",this.size="",this.opacity=1;}load(t){void 0!==t&&(void 0!==t.color&&(this.color=At.create(this.color,t.color)),void 0!==t.image&&(this.image=t.image),void 0!==t.position&&(this.position=t.position),void 0!==t.repeat&&(this.repeat=t.repeat),void 0!==t.size&&(this.size=t.size),void 0!==t.opacity&&(this.opacity=t.opacity));}}class yi{constructor(){this.color=new At,this.color.value="#ff0000",this.radius=0,this.rate=1;}load(t){void 0!==t&&(void 0!==t.color&&(this.color=At.create(this.color,t.color)),this.duration=t.duration,this.infectedStage=t.infectedStage,void 0!==t.radius&&(this.radius=t.radius),void 0!==t.rate&&(this.rate=t.rate));}}class fi{constructor(){this.cure=!1,this.delay=0,this.enable=!1,this.infections=0,this.stages=[];}load(t){void 0!==t&&(void 0!==t.cure&&(this.cure=t.cure),void 0!==t.delay&&(this.delay=t.delay),void 0!==t.enable&&(this.enable=t.enable),void 0!==t.infections&&(this.infections=t.infections),void 0!==t.stages&&(this.stages=t.stages.map((t=>{const e=new yi;return e.load(t),e}))));}}class mi{constructor(){this.mode=_.any,this.value=!1;}load(t){void 0!==t&&(void 0!==t.mode&&(this.mode=t.mode),void 0!==t.value&&(this.value=t.value));}}class gi{constructor(){this.name="",this.default=new mi;}load(t){void 0!==t&&(void 0!==t.name&&(this.name=t.name),this.default.load(t.default),void 0!==t.options&&(this.options=J.deepExtend({},t.options)));}}class bi{constructor(){this.enable=!1,this.zIndex=-1;}load(t){t&&(void 0!==t.enable&&(this.enable=t.enable),void 0!==t.zIndex&&(this.zIndex=t.zIndex));}}class wi{constructor(){this.factor=4,this.value=!0;}load(t){t&&(void 0!==t.factor&&(this.factor=t.factor),void 0!==t.value&&(this.value=t.value));}}class xi{constructor(){this.disable=!1,this.reduce=new wi;}load(t){t&&(void 0!==t.disable&&(this.disable=t.disable),this.reduce.load(t.reduce));}}class ki{load(t){var e,i;t&&(void 0!==t.position&&(this.position={x:null!==(e=t.position.x)&&void 0!==e?e:50,y:null!==(i=t.position.y)&&void 0!==i?i:50}),void 0!==t.options&&(this.options=J.deepExtend({},t.options)));}}class Pi{constructor(){this.maxWidth=1/0,this.options={};}load(t){t&&(void 0!==t.maxWidth&&(this.maxWidth=t.maxWidth),void 0!==t.options&&(this.options=J.deepExtend({},t.options)));}}class Mi{constructor(){this.autoPlay=!0,this.background=new pi,this.backgroundMask=new vi,this.fullScreen=new bi,this.detectRetina=!0,this.fpsLimit=60,this.infection=new fi,this.interactivity=new hi,this.manualParticles=[],this.motion=new xi,this.particles=new me,this.pauseOnBlur=!0,this.pauseOnOutsideViewport=!0,this.responsive=[],this.themes=[];}get fps_limit(){return this.fpsLimit}set fps_limit(t){this.fpsLimit=t;}get retina_detect(){return this.detectRetina}set retina_detect(t){this.detectRetina=t;}get backgroundMode(){return this.fullScreen}set backgroundMode(t){this.fullScreen.load(t);}load(t){var e,i,o;if(void 0===t)return;if(void 0!==t.preset)if(t.preset instanceof Array)for(const e of t.preset)this.importPreset(e);else this.importPreset(t.preset);void 0!==t.autoPlay&&(this.autoPlay=t.autoPlay);const s=null!==(e=t.detectRetina)&&void 0!==e?e:t.retina_detect;void 0!==s&&(this.detectRetina=s);const n=null!==(i=t.fpsLimit)&&void 0!==i?i:t.fps_limit;if(void 0!==n&&(this.fpsLimit=n),void 0!==t.pauseOnBlur&&(this.pauseOnBlur=t.pauseOnBlur),void 0!==t.pauseOnOutsideViewport&&(this.pauseOnOutsideViewport=t.pauseOnOutsideViewport),this.background.load(t.background),this.fullScreen.load(null!==(o=t.fullScreen)&&void 0!==o?o:t.backgroundMode),this.backgroundMask.load(t.backgroundMask),this.infection.load(t.infection),this.interactivity.load(t.interactivity),void 0!==t.manualParticles&&(this.manualParticles=t.manualParticles.map((t=>{const e=new ki;return e.load(t),e}))),this.motion.load(t.motion),this.particles.load(t.particles),vt.loadOptions(this,t),void 0!==t.responsive)for(const e of t.responsive){const t=new Pi;t.load(e),this.responsive.push(t);}if(this.responsive.sort(((t,e)=>t.maxWidth-e.maxWidth)),void 0!==t.themes)for(const e of t.themes){const t=new gi;t.load(e),this.themes.push(t);}}setTheme(t){if(t){const e=this.themes.find((e=>e.name===t));e&&this.load(e.options);}else {const t="undefined"!=typeof matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches;let e=this.themes.find((e=>e.default.value&&(e.default.mode===_.dark&&t||e.default.mode===_.light&&!t)));e||(e=this.themes.find((t=>t.default.value&&t.default.mode===_.any))),e&&this.load(e.options);}}importPreset(t){this.load(vt.getPreset(t));}setResponsive(t,e,i){var o;this.load(i),this.load(null===(o=this.responsive.find((i=>i.maxWidth*e>t)))||void 0===o?void 0:o.options);}}var Ri=function(t,e,i,o){return new(i||(i=Promise))((function(s,n){function a(t){try{l(o.next(t));}catch(t){n(t);}}function r(t){try{l(o.throw(t));}catch(t){n(t);}}function l(t){var e;t.done?s(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(a,r);}l((o=o.apply(t,e||[])).next());}))};class Si{constructor(t,e,...i){this.id=t,this.fpsLimit=60,this.firstStart=!0,this.started=!1,this.destroyed=!1,this.paused=!0,this.lastFrameTime=0,this.pageHidden=!1,this._sourceOptions=e,this.retina=new Ve(this),this.canvas=new St(this),this.particles=new Le(this),this.drawer=new He(this),this.pathGenerator={generate:()=>{const t=T.create(0,0);return t.length=Math.random(),t.angle=Math.random()*Math.PI*2,t},init:()=>{},update:()=>{}},this.interactivity={mouse:{clicking:!1,inside:!1}},this.bubble={},this.repulse={particles:[]},this.attract={particles:[]},this.plugins=new Map,this.drawers=new Map,this.density=1,this._options=new Mi,this.actualOptions=new Mi;for(const t of i)this._options.load(vt.getPreset(t));const o=vt.getSupportedShapes();for(const t of o){const e=vt.getShapeDrawer(t);e&&this.drawers.set(t,e);}this._options&&this._options.load(this._sourceOptions),this.eventListeners=new lt(this),"undefined"!=typeof IntersectionObserver&&IntersectionObserver&&(this.intersectionObserver=new IntersectionObserver((t=>this.intersectionManager(t))));}get options(){return this._options}get sourceOptions(){return this._sourceOptions}play(t){const e=this.paused||t;if(!this.firstStart||this.actualOptions.autoPlay){if(this.paused&&(this.paused=!1),e){for(const[,t]of this.plugins)t.play&&t.play();this.lastFrameTime=performance.now();}this.draw();}else this.firstStart=!1;}pause(){if(void 0!==this.drawAnimationFrame&&(J.cancelAnimation(this.drawAnimationFrame),delete this.drawAnimationFrame),!this.paused){for(const[,t]of this.plugins)t.pause&&t.pause();this.pageHidden||(this.paused=!0);}}draw(){this.drawAnimationFrame=J.animate((t=>this.drawer.nextFrame(t)));}getAnimationStatus(){return !this.paused}setNoise(t,e,i){this.setPath(t,e,i);}setPath(t,e,i){t&&("function"==typeof t?(this.pathGenerator.generate=t,e&&(this.pathGenerator.init=e),i&&(this.pathGenerator.update=i)):(t.generate&&(this.pathGenerator.generate=t.generate),t.init&&(this.pathGenerator.init=t.init),t.update&&(this.pathGenerator.update=t.update)));}destroy(){this.stop(),this.canvas.destroy();for(const[,t]of this.drawers)t.destroy&&t.destroy(this);for(const t of this.drawers.keys())this.drawers.delete(t);this.destroyed=!0;}exportImg(t){this.exportImage(t);}exportImage(t,e,i){var o;return null===(o=this.canvas.element)||void 0===o?void 0:o.toBlob(t,null!=e?e:"image/png",i)}exportConfiguration(){return JSON.stringify(this.actualOptions,void 0,2)}refresh(){return this.stop(),this.start()}reset(){return this._options=new Mi,this.refresh()}stop(){if(this.started){this.firstStart=!0,this.started=!1,this.eventListeners.removeListeners(),this.pause(),this.particles.clear(),this.canvas.clear(),this.interactivity.element instanceof HTMLElement&&this.intersectionObserver&&this.intersectionObserver.observe(this.interactivity.element);for(const[,t]of this.plugins)t.stop&&t.stop();for(const t of this.plugins.keys())this.plugins.delete(t);this.particles.linksColors=new Map,delete this.particles.grabLineColor,delete this.particles.linksColor;}}loadTheme(t){return Ri(this,void 0,void 0,(function*(){this.actualOptions.setTheme(t),yield this.refresh();}))}start(){return Ri(this,void 0,void 0,(function*(){if(!this.started){yield this.init(),this.started=!0,this.eventListeners.addListeners(),this.interactivity.element instanceof HTMLElement&&this.intersectionObserver&&this.intersectionObserver.observe(this.interactivity.element);for(const[,t]of this.plugins)void 0!==t.startAsync?yield t.startAsync():void 0!==t.start&&t.start();this.play();}}))}init(){return Ri(this,void 0,void 0,(function*(){this.actualOptions=new Mi,this.actualOptions.load(this._options),this.retina.init(),this.canvas.init(),this.actualOptions.setResponsive(this.canvas.size.width,this.retina.pixelRatio,this._options),this.actualOptions.setTheme(void 0),this.fpsLimit=this.actualOptions.fpsLimit>0?this.actualOptions.fpsLimit:60;const t=vt.getAvailablePlugins(this);for(const[e,i]of t)this.plugins.set(e,i);for(const[,t]of this.drawers)t.init&&(yield t.init(this));for(const[,t]of this.plugins)t.init?t.init(this.actualOptions):void 0!==t.initAsync&&(yield t.initAsync(this.actualOptions));this.canvas.resize(),this.particles.init(),this.particles.setDensity();}))}intersectionManager(t){if(this.actualOptions.pauseOnOutsideViewport)for(const e of t)e.target===this.interactivity.element&&(e.isIntersecting?this.play():this.pause());}}var Ci=function(t,e,i,o){return new(i||(i=Promise))((function(s,n){function a(t){try{l(o.next(t));}catch(t){n(t);}}function r(t){try{l(o.throw(t));}catch(t){n(t);}}function l(t){var e;t.done?s(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(a,r);}l((o=o.apply(t,e||[])).next());}))};const zi=[];function Ai(t){console.error(`Error tsParticles - fetch status: ${t}`),console.error("Error tsParticles - File config not found");}class Ti{static dom(){return zi}static domItem(t){const e=Ti.dom(),i=e[t];if(i&&!i.destroyed)return i;e.splice(t,1);}static load(t,e,i){return Ci(this,void 0,void 0,(function*(){const o=document.getElementById(t);if(o)return Ti.set(t,o,e,i)}))}static set(t,e,i,o){return Ci(this,void 0,void 0,(function*(){const s=i instanceof Array?J.itemFromArray(i,o):i,n=Ti.dom(),a=n.findIndex((e=>e.id===t));if(a>=0){const t=Ti.domItem(a);t&&!t.destroyed&&(t.destroy(),n.splice(a,1));}let r,l;if("canvas"===e.tagName.toLowerCase())r=e,l=!1;else {const t=e.getElementsByTagName("canvas");t.length?(r=t[0],r.className||(r.className=Q.canvasClass),l=!1):(l=!0,r=document.createElement("canvas"),r.className=Q.canvasClass,r.style.width="100%",r.style.height="100%",e.appendChild(r));}const c=new Si(t,s);return a>=0?n.splice(a,0,c):n.push(c),c.canvas.loadCanvas(r,l),yield c.start(),c}))}static loadJSON(t,e,i){return Ci(this,void 0,void 0,(function*(){const o=e instanceof Array?J.itemFromArray(e,i):e,s=yield fetch(o);if(s.ok)return Ti.load(t,yield s.json());Ai(s.status);}))}static setJSON(t,e,i){return Ci(this,void 0,void 0,(function*(){const o=yield fetch(i);if(o.ok){const i=yield o.json();return Ti.set(t,e,i)}Ai(o.status);}))}static setOnClickHandler(t){const e=Ti.dom();if(0===e.length)throw new Error("Can only set click handlers after calling tsParticles.load() or tsParticles.loadJSON()");for(const i of e){const e=i.interactivity.element;if(!e)continue;const o=(e,o)=>{if(i.destroyed)return;const s=i.retina.pixelRatio,n={x:o.x*s,y:o.y*s},a=i.particles.quadTree.queryCircle(n,i.retina.sizeValue);t(e,a);},s=t=>{if(i.destroyed)return;const e=t,s={x:e.offsetX||e.clientX,y:e.offsetY||e.clientY};o(t,s);},n=()=>{i.destroyed||(c=!0,d=!1);},a=()=>{i.destroyed||(d=!0);},r=t=>{var e,s,n;if(!i.destroyed){if(c&&!d){const a=t,r=a.touches[a.touches.length-1],l=null===(e=i.canvas.element)||void 0===e?void 0:e.getBoundingClientRect(),c={x:r.clientX-(null!==(s=null==l?void 0:l.left)&&void 0!==s?s:0),y:r.clientY-(null!==(n=null==l?void 0:l.top)&&void 0!==n?n:0)};o(t,c);}c=!1,d=!1;}},l=()=>{i.destroyed||(c=!1,d=!1);};let c=!1,d=!1;e.addEventListener("click",s),e.addEventListener("touchstart",n),e.addEventListener("touchmove",a),e.addEventListener("touchend",r),e.addEventListener("touchcancel",l);}}}var Ei,Di,Oi=function(t,e,i,o){return new(i||(i=Promise))((function(s,n){function a(t){try{l(o.next(t));}catch(t){n(t);}}function r(t){try{l(o.throw(t));}catch(t){n(t);}}function l(t){var e;t.done?s(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(a,r);}l((o=o.apply(t,e||[])).next());}))},Ii=function(t,e,i){if(!e.has(t))throw new TypeError("attempted to set private field on non-instance");return e.set(t,i),i},Fi=function(t,e){if(!e.has(t))throw new TypeError("attempted to get private field on non-instance");return e.get(t)};Ei=new WeakMap;class Li{constructor(t,e,i,o){var s,n,a;this.absorbers=t,this.container=e,this.initialPosition=o?T.create(o.x,o.y):void 0,this.options=i,this.dragging=!1,this.name=this.options.name,this.opacity=this.options.opacity,this.size=E.getValue(i.size)*e.retina.pixelRatio,this.mass=this.size*i.size.density*e.retina.reduceFactor;const r=i.size.limit;this.limit=void 0!==r?r*e.retina.pixelRatio*e.retina.reduceFactor:r;const l="string"==typeof i.color?{value:i.color}:i.color;this.color=null!==(s=tt.colorToRgb(l))&&void 0!==s?s:{b:0,g:0,r:0},this.position=null!==(a=null===(n=this.initialPosition)||void 0===n?void 0:n.copy())&&void 0!==a?a:this.calcPosition();}attract(t){const e=this.options;if(e.draggable){const t=this.container.interactivity.mouse;if(t.clicking&&t.downPosition){E.getDistance(this.position,t.downPosition)<=this.size&&(this.dragging=!0);}else this.dragging=!1;this.dragging&&t.position&&(this.position.x=t.position.x,this.position.y=t.position.y);}const i=t.getPosition(),{dx:o,dy:s,distance:n}=E.getDistances(this.position,i),a=T.create(o,s);if(a.length=this.mass/Math.pow(n,2)*this.container.retina.reduceFactor,n<this.size+t.getRadius()){const i=.033*t.getRadius()*this.container.retina.pixelRatio;this.size>t.getRadius()&&n<this.size-t.getRadius()?e.destroy?t.destroy():(t.needsNewPosition=!0,this.updateParticlePosition(t,a)):(e.destroy&&(t.size.value-=i),this.updateParticlePosition(t,a)),(void 0===this.limit||this.size<this.limit)&&(this.size+=i),this.mass+=i*this.options.size.density*this.container.retina.reduceFactor;}else this.updateParticlePosition(t,a);}resize(){const t=this.initialPosition;this.position=t&&J.isPointInside(t,this.container.canvas.size)?t:this.calcPosition();}draw(t){t.translate(this.position.x,this.position.y),t.beginPath(),t.arc(0,0,this.size,0,2*Math.PI,!1),t.closePath(),t.fillStyle=tt.getStyleFromRgb(this.color,this.opacity),t.fill();}calcPosition(){var t,e;const i=this.container,o=this.options.position;return T.create((null!==(t=null==o?void 0:o.x)&&void 0!==t?t:100*Math.random())/100*i.canvas.size.width,(null!==(e=null==o?void 0:o.y)&&void 0!==e?e:100*Math.random())/100*i.canvas.size.height)}updateParticlePosition(t,e){var i;if(t.destroyed)return;const o=this.container.canvas.size;if(t.needsNewPosition){const e=t.getRadius();t.position.x=Math.random()*(o.width-2*e)+e,t.position.y=Math.random()*(o.height-2*e)+e,t.needsNewPosition=!1;}this.options.orbits?(void 0===t.orbit&&(t.orbit=T.create(0,0),t.orbit.length=E.getDistance(t.getPosition(),this.position),t.orbit.angle=Math.random()*Math.PI*2),t.orbit.length<=this.size&&!this.options.destroy&&(t.orbit.length=Math.random()*Math.max(o.width,o.height)),t.velocity.x=0,t.velocity.y=0,t.position.setTo(t.orbit.add(this.position)),t.orbit.length-=e.length,t.orbit.angle+=(null!==(i=t.moveSpeed)&&void 0!==i?i:E.getRangeValue(t.options.move.speed)*this.container.retina.pixelRatio)/100*this.container.retina.reduceFactor):t.velocity.addTo(e);}}class Vi extends Lt{constructor(){super(),this.density=5,this.random.minimumValue=1,this.value=50;}load(t){t&&(super.load(t),void 0!==t.density&&(this.density=t.density),void 0!==t.limit&&(this.limit=t.limit),void 0!==t.limit&&(this.limit=t.limit));}}class Hi{constructor(){this.color=new At,this.color.value="#000000",this.draggable=!1,this.opacity=1,this.destroy=!0,this.orbits=!1,this.size=new Vi;}load(t){void 0!==t&&(void 0!==t.color&&(this.color=At.create(this.color,t.color)),void 0!==t.draggable&&(this.draggable=t.draggable),this.name=t.name,void 0!==t.opacity&&(this.opacity=t.opacity),void 0!==t.position&&(this.position={x:t.position.x,y:t.position.y}),void 0!==t.size&&this.size.load(t.size),void 0!==t.destroy&&(this.destroy=t.destroy),void 0!==t.orbits&&(this.orbits=t.orbits));}}!function(t){t.absorber="absorber";}(Di||(Di={}));class _i{constructor(t){this.container=t,this.array=[],this.absorbers=[],this.interactivityAbsorbers=[];t.addAbsorber=(t,e)=>this.addAbsorber(t,e);}init(t){var e,i;if(!t)return;t.absorbers&&(t.absorbers instanceof Array?this.absorbers=t.absorbers.map((t=>{const e=new Hi;return e.load(t),e})):(this.absorbers instanceof Array&&(this.absorbers=new Hi),this.absorbers.load(t.absorbers)));const o=null===(i=null===(e=t.interactivity)||void 0===e?void 0:e.modes)||void 0===i?void 0:i.absorbers;if(o&&(o instanceof Array?this.interactivityAbsorbers=o.map((t=>{const e=new Hi;return e.load(t),e})):(this.interactivityAbsorbers instanceof Array&&(this.interactivityAbsorbers=new Hi),this.interactivityAbsorbers.load(o))),this.absorbers instanceof Array)for(const t of this.absorbers)this.addAbsorber(t);else this.addAbsorber(this.absorbers);}particleUpdate(t){for(const e of this.array)if(e.attract(t),t.destroyed)break}draw(t){for(const e of this.array)t.save(),e.draw(t),t.restore();}stop(){this.array=[];}resize(){for(const t of this.array)t.resize();}handleClickMode(t){const e=this.container,i=this.absorbers,o=this.interactivityAbsorbers;if(t===Di.absorber){let t;o instanceof Array?o.length>0&&(t=J.itemFromArray(o)):t=o;const s=null!=t?t:i instanceof Array?J.itemFromArray(i):i,n=e.interactivity.mouse.clickPosition;this.addAbsorber(s,n);}}addAbsorber(t,e){const i=new Li(this,this.container,t,e);return this.array.push(i),i}removeAbsorber(t){const e=this.array.indexOf(t);e>=0&&this.array.splice(e,1);}}const qi=new class{constructor(){this.id="absorbers";}getPlugin(t){return new _i(t)}needsPlugin(t){var e,i,o;if(void 0===t)return !1;const s=t.absorbers;let n=!1;return s instanceof Array?s.length&&(n=!0):(void 0!==s||(null===(o=null===(i=null===(e=t.interactivity)||void 0===e?void 0:e.events)||void 0===i?void 0:i.onClick)||void 0===o?void 0:o.mode)&&J.isInArray(Di.absorber,t.interactivity.events.onClick.mode))&&(n=!0),n}loadOptions(t,e){var i,o;if(!this.needsPlugin(t)&&!this.needsPlugin(e))return;const s=t;if(null==e?void 0:e.absorbers)if((null==e?void 0:e.absorbers)instanceof Array)s.absorbers=null==e?void 0:e.absorbers.map((t=>{const e=new Hi;return e.load(t),e}));else {let t=s.absorbers;void 0===(null==t?void 0:t.load)&&(s.absorbers=t=new Hi),t.load(null==e?void 0:e.absorbers);}const n=null===(o=null===(i=null==e?void 0:e.interactivity)||void 0===i?void 0:i.modes)||void 0===o?void 0:o.absorbers;if(n)if(n instanceof Array)s.interactivity.modes.absorbers=n.map((t=>{const e=new Hi;return e.load(t),e}));else {let t=s.interactivity.modes.absorbers;void 0===(null==t?void 0:t.load)&&(s.interactivity.modes.absorbers=t=new Hi),t.load(n);}}};class Bi{constructor(){this.mode=H.percent,this.height=0,this.width=0;}load(t){void 0!==t&&(void 0!==t.mode&&(this.mode=t.mode),void 0!==t.height&&(this.height=t.height),void 0!==t.width&&(this.width=t.width));}}function $i(t,e){return t+e*(Math.random()-.5)}function Wi(t,e){return {x:$i(t.x,e.x),y:$i(t.y,e.y)}}class Gi{constructor(t,e,i,o){var s,n,a,r;this.emitters=t,this.container=e,this.firstSpawn=!0,this.currentDuration=0,this.currentEmitDelay=0,this.currentSpawnDelay=0,this.initialPosition=o,this.emitterOptions=J.deepExtend({},i),this.spawnDelay=1e3*(null!==(s=this.emitterOptions.life.delay)&&void 0!==s?s:0)/this.container.retina.reduceFactor,this.position=null!==(n=this.initialPosition)&&void 0!==n?n:this.calcPosition(),this.name=i.name;let l=J.deepExtend({},this.emitterOptions.particles);void 0===l&&(l={}),void 0===l.move&&(l.move={}),void 0===l.move.direction&&(l.move.direction=this.emitterOptions.direction),void 0!==this.emitterOptions.spawnColor&&(this.spawnColor=tt.colorToHsl(this.emitterOptions.spawnColor)),this.paused=!this.emitterOptions.autoPlay,this.particlesOptions=l,this.size=null!==(a=this.emitterOptions.size)&&void 0!==a?a:(()=>{const t=new Bi;return t.load({height:0,mode:H.percent,width:0}),t})(),this.lifeCount=null!==(r=this.emitterOptions.life.count)&&void 0!==r?r:-1,this.immortal=this.lifeCount<=0,this.play();}externalPlay(){this.paused=!1,this.play();}externalPause(){this.paused=!0,this.pause();}play(){this.paused||this.container.retina.reduceFactor&&(this.lifeCount>0||this.immortal||!this.emitterOptions.life.count)&&(void 0===this.emitDelay&&(this.emitDelay=1e3*this.emitterOptions.rate.delay/this.container.retina.reduceFactor),(this.lifeCount>0||this.immortal)&&this.prepareToDie());}pause(){this.paused||delete this.emitDelay;}resize(){const t=this.initialPosition;this.position=t&&J.isPointInside(t,this.container.canvas.size)?t:this.calcPosition();}update(t){var e,i,o;this.paused||(this.firstSpawn&&(this.firstSpawn=!1,this.currentSpawnDelay=null!==(e=this.spawnDelay)&&void 0!==e?e:0,this.currentEmitDelay=null!==(i=this.emitDelay)&&void 0!==i?i:0,t.value=0),void 0!==this.duration&&(this.currentDuration+=t.value,this.currentDuration>=this.duration&&(this.pause(),void 0!==this.spawnDelay&&delete this.spawnDelay,this.immortal||this.lifeCount--,this.lifeCount>0||this.immortal?(this.position=this.calcPosition(),this.spawnDelay=1e3*(null!==(o=this.emitterOptions.life.delay)&&void 0!==o?o:0)/this.container.retina.reduceFactor):this.destroy(),this.currentDuration-=this.duration,delete this.duration)),void 0!==this.spawnDelay&&(this.currentSpawnDelay+=t.value,this.currentSpawnDelay>=this.spawnDelay&&(this.play(),this.currentSpawnDelay-=this.currentSpawnDelay,delete this.spawnDelay)),void 0!==this.emitDelay&&(this.currentEmitDelay+=t.value,this.currentEmitDelay>=this.emitDelay&&(this.emit(),this.currentEmitDelay-=this.emitDelay)));}prepareToDie(){var t;if(this.paused)return;const e=null===(t=this.emitterOptions.life)||void 0===t?void 0:t.duration;this.container.retina.reduceFactor&&(this.lifeCount>0||this.immortal)&&void 0!==e&&e>0&&(this.duration=1e3*e);}destroy(){this.emitters.removeEmitter(this);}calcPosition(){var t,e;const i=this.container,o=this.emitterOptions.position;return {x:(null!==(t=null==o?void 0:o.x)&&void 0!==t?t:100*Math.random())/100*i.canvas.size.width,y:(null!==(e=null==o?void 0:o.y)&&void 0!==e?e:100*Math.random())/100*i.canvas.size.height}}emit(){var t;if(this.paused)return;const e=this.container,i=this.position,o={x:this.size.mode===H.percent?e.canvas.size.width*this.size.width/100:this.size.width,y:this.size.mode===H.percent?e.canvas.size.height*this.size.height/100:this.size.height};for(let s=0;s<this.emitterOptions.rate.quantity;s++){const s=J.deepExtend({},this.particlesOptions);if(void 0!==this.spawnColor){const e=null===(t=this.emitterOptions.spawnColor)||void 0===t?void 0:t.animation;if(e){const t=e;if(t.enable)this.spawnColor.h=this.setColorAnimation(t,this.spawnColor.h,360);else {const t=e;this.spawnColor.h=this.setColorAnimation(t.h,this.spawnColor.h,360),this.spawnColor.s=this.setColorAnimation(t.s,this.spawnColor.s,100),this.spawnColor.l=this.setColorAnimation(t.l,this.spawnColor.l,100);}}s.color?s.color.value=this.spawnColor:s.color={value:this.spawnColor};}e.particles.addParticle(Wi(i,o),s);}}setColorAnimation(t,e,i){var o;const s=this.container;if(!t.enable)return e;const n=E.randomInRange(t.offset),a=1e3*this.emitterOptions.rate.delay/s.retina.reduceFactor;return (e+(null!==(o=t.speed)&&void 0!==o?o:0)*s.fpsLimit/a+3.6*n)%i}}class Ni{constructor(){this.quantity=1,this.delay=.1;}load(t){void 0!==t&&(void 0!==t.quantity&&(this.quantity=t.quantity),void 0!==t.delay&&(this.delay=t.delay));}}class Ui{load(t){void 0!==t&&(void 0!==t.count&&(this.count=t.count),void 0!==t.delay&&(this.delay=t.delay),void 0!==t.duration&&(this.duration=t.duration));}}class ji{constructor(){this.autoPlay=!0,this.direction=z.none,this.life=new Ui,this.rate=new Ni;}load(t){void 0!==t&&(void 0!==t.autoPlay&&(this.autoPlay=t.autoPlay),void 0!==t.size&&(void 0===this.size&&(this.size=new Bi),this.size.load(t.size)),void 0!==t.direction&&(this.direction=t.direction),this.life.load(t.life),this.name=t.name,void 0!==t.particles&&(this.particles=J.deepExtend({},t.particles)),this.rate.load(t.rate),void 0!==t.position&&(this.position={x:t.position.x,y:t.position.y}),void 0!==t.spawnColor&&(void 0===this.spawnColor&&(this.spawnColor=new ie),this.spawnColor.load(t.spawnColor)));}}var Yi;!function(t){t.emitter="emitter";}(Yi||(Yi={}));class Xi{constructor(t){this.container=t,this.array=[],this.emitters=[],this.interactivityEmitters=[];const e=t;e.addEmitter=(t,e)=>this.addEmitter(t,e),e.playEmitter=t=>{const e=void 0===t||"number"==typeof t?this.array[t||0]:this.array.find((e=>e.name===t));e&&e.externalPlay();},e.pauseEmitter=t=>{const e=void 0===t||"number"==typeof t?this.array[t||0]:this.array.find((e=>e.name===t));e&&e.externalPause();};}init(t){var e,i;if(!t)return;t.emitters&&(t.emitters instanceof Array?this.emitters=t.emitters.map((t=>{const e=new ji;return e.load(t),e})):(this.emitters instanceof Array&&(this.emitters=new ji),this.emitters.load(t.emitters)));const o=null===(i=null===(e=t.interactivity)||void 0===e?void 0:e.modes)||void 0===i?void 0:i.emitters;if(o&&(o instanceof Array?this.interactivityEmitters=o.map((t=>{const e=new ji;return e.load(t),e})):(this.interactivityEmitters instanceof Array&&(this.interactivityEmitters=new ji),this.interactivityEmitters.load(o))),this.emitters instanceof Array)for(const t of this.emitters)this.addEmitter(t);else this.addEmitter(this.emitters);}play(){for(const t of this.array)t.play();}pause(){for(const t of this.array)t.pause();}stop(){this.array=[];}update(t){for(const e of this.array)e.update(t);}handleClickMode(t){const e=this.container,i=this.emitters,o=this.interactivityEmitters;if(t===Yi.emitter){let t;o instanceof Array?o.length>0&&(t=J.itemFromArray(o)):t=o;const s=null!=t?t:i instanceof Array?J.itemFromArray(i):i,n=e.interactivity.mouse.clickPosition;this.addEmitter(J.deepExtend({},s),n);}}resize(){for(const t of this.array)t.resize();}addEmitter(t,e){const i=new Gi(this,this.container,t,e);return this.array.push(i),i}removeEmitter(t){const e=this.array.indexOf(t);e>=0&&this.array.splice(e,1);}}const Ji=new class{constructor(){this.id="emitters";}getPlugin(t){return new Xi(t)}needsPlugin(t){var e,i,o;if(void 0===t)return !1;const s=t.emitters;let n=!1;return s instanceof Array?s.length&&(n=!0):(void 0!==s||(null===(o=null===(i=null===(e=t.interactivity)||void 0===e?void 0:e.events)||void 0===i?void 0:i.onClick)||void 0===o?void 0:o.mode)&&J.isInArray(Yi.emitter,t.interactivity.events.onClick.mode))&&(n=!0),n}loadOptions(t,e){var i,o;if(!this.needsPlugin(t)&&!this.needsPlugin(e))return;const s=t;if(null==e?void 0:e.emitters)if((null==e?void 0:e.emitters)instanceof Array)s.emitters=null==e?void 0:e.emitters.map((t=>{const e=new ji;return e.load(t),e}));else {let t=s.emitters;void 0===(null==t?void 0:t.load)&&(s.emitters=t=new ji),t.load(null==e?void 0:e.emitters);}const n=null===(o=null===(i=null==e?void 0:e.interactivity)||void 0===i?void 0:i.modes)||void 0===o?void 0:o.emitters;if(n)if(n instanceof Array)s.interactivity.modes.emitters=n.map((t=>{const e=new ji;return e.load(t),e}));else {let t=s.interactivity.modes.emitters;void 0===(null==t?void 0:t.load)&&(s.interactivity.modes.emitters=t=new ji),t.load(n);}}};var Qi,Zi,Ki;!function(t){t.equidistant="equidistant",t.onePerPoint="one-per-point",t.perPoint="per-point",t.randomLength="random-length",t.randomPoint="random-point";}(Qi||(Qi={})),function(t){t.path="path",t.radius="radius";}(Zi||(Zi={})),function(t){t.inline="inline",t.inside="inside",t.outside="outside",t.none="none";}(Ki||(Ki={}));class to{constructor(){this.color=new At,this.width=.5,this.opacity=1;}load(t){var e;void 0!==t&&(this.color=At.create(this.color,t.color),"string"==typeof this.color.value&&(this.opacity=null!==(e=tt.stringToAlpha(this.color.value))&&void 0!==e?e:this.opacity),void 0!==t.opacity&&(this.opacity=t.opacity),void 0!==t.width&&(this.width=t.width));}}class eo{constructor(){this.enable=!1,this.stroke=new to;}get lineWidth(){return this.stroke.width}set lineWidth(t){this.stroke.width=t;}get lineColor(){return this.stroke.color}set lineColor(t){this.stroke.color=At.create(this.stroke.color,t);}load(t){var e;if(void 0!==t){void 0!==t.enable&&(this.enable=t.enable);const i=null!==(e=t.stroke)&&void 0!==e?e:{color:t.lineColor,width:t.lineWidth};this.stroke.load(i);}}}class io{constructor(){this.radius=10,this.type=Zi.path;}load(t){void 0!==t&&(void 0!==t.radius&&(this.radius=t.radius),void 0!==t.type&&(this.type=t.type));}}class oo{constructor(){this.arrangement=Qi.onePerPoint;}load(t){void 0!==t&&void 0!==t.arrangement&&(this.arrangement=t.arrangement);}}class so{constructor(){this.path=[],this.size={height:0,width:0};}load(t){void 0!==t&&(void 0!==t.path&&(this.path=t.path),void 0!==t.size&&(void 0!==t.size.width&&(this.size.width=t.size.width),void 0!==t.size.height&&(this.size.height=t.size.height)));}}class no{constructor(){this.draw=new eo,this.enable=!1,this.inline=new oo,this.move=new io,this.scale=1,this.type=Ki.none;}get inlineArrangement(){return this.inline.arrangement}set inlineArrangement(t){this.inline.arrangement=t;}load(t){var e;if(void 0!==t){this.draw.load(t.draw);const i=null!==(e=t.inline)&&void 0!==e?e:{arrangement:t.inlineArrangement};void 0!==i&&this.inline.load(i),this.move.load(t.move),void 0!==t.scale&&(this.scale=t.scale),void 0!==t.type&&(this.type=t.type),void 0!==t.enable?this.enable=t.enable:this.enable=this.type!==Ki.none,void 0!==t.url&&(this.url=t.url),void 0!==t.data&&("string"==typeof t.data?this.data=t.data:(this.data=new so,this.data.load(t.data))),void 0!==t.position&&(this.position=J.deepExtend({},t.position));}}}var ao=function(t,e,i,o){return new(i||(i=Promise))((function(s,n){function a(t){try{l(o.next(t));}catch(t){n(t);}}function r(t){try{l(o.throw(t));}catch(t){n(t);}}function l(t){var e;t.done?s(t.value):(e=t.value,e instanceof i?e:new i((function(t){t(e);}))).then(a,r);}l((o=o.apply(t,e||[])).next());}))};function ro(t){t.velocity.x=t.velocity.y/2-t.velocity.x,t.velocity.y=t.velocity.x/2-t.velocity.y;}function lo(t,e,i){const o=tt.colorToRgb(i.color);if(o){t.beginPath(),t.moveTo(e[0].x,e[0].y);for(const i of e)t.lineTo(i.x,i.y);t.closePath(),t.strokeStyle=tt.getStyleFromRgb(o),t.lineWidth=i.width,t.stroke();}}function co(t,e,i,o){t.translate(o.x,o.y);const s=tt.colorToRgb(i.color);s&&(t.strokeStyle=tt.getStyleFromRgb(s,i.opacity),t.lineWidth=i.width,t.stroke(e));}class ho{constructor(t){this.container=t,this.dimension={height:0,width:0},this.path2DSupported=!!window.Path2D,this.options=new no,this.polygonMaskMoveRadius=this.options.move.radius*t.retina.pixelRatio;}initAsync(t){return ao(this,void 0,void 0,(function*(){this.options.load(null==t?void 0:t.polygon);const e=this.options;this.polygonMaskMoveRadius=e.move.radius*this.container.retina.pixelRatio,e.enable&&(yield this.initRawData());}))}resize(){const t=this.container,e=this.options;e.enable&&e.type!==Ki.none&&(this.redrawTimeout&&clearTimeout(this.redrawTimeout),this.redrawTimeout=window.setTimeout((()=>ao(this,void 0,void 0,(function*(){yield this.initRawData(!0),t.particles.redraw();}))),250));}stop(){delete this.raw,delete this.paths;}particlesInitialization(){const t=this.options;return !(!t.enable||t.type!==Ki.inline||t.inline.arrangement!==Qi.onePerPoint&&t.inline.arrangement!==Qi.perPoint)&&(this.drawPoints(),!0)}particlePosition(t){var e,i;if(this.options.enable&&(null!==(i=null===(e=this.raw)||void 0===e?void 0:e.length)&&void 0!==i?i:0)>0)return J.deepExtend({},t||this.randomPoint())}particleBounce(t){const e=this.options;if(e.enable&&e.type!==Ki.none&&e.type!==Ki.inline){if(!this.checkInsidePolygon(t.getPosition()))return ro(t),!0}else if(e.enable&&e.type===Ki.inline&&t.initialPosition){if(E.getDistance(t.initialPosition,t.getPosition())>this.polygonMaskMoveRadius)return ro(t),!0}return !1}clickPositionValid(t){const e=this.options;return e.enable&&e.type!==Ki.none&&e.type!==Ki.inline&&this.checkInsidePolygon(t)}draw(t){var e;if(!(null===(e=this.paths)||void 0===e?void 0:e.length))return;const i=this.options,o=i.draw;if(!i.enable||!o.enable)return;const s=this.raw;for(const e of this.paths){const i=e.path2d,n=this.path2DSupported;t&&(n&&i&&this.offset?co(t,i,o.stroke,this.offset):s&&lo(t,s,o.stroke));}}checkInsidePolygon(t){var e,i;const o=this.container,s=this.options;if(!s.enable||s.type===Ki.none||s.type===Ki.inline)return !0;if(!this.raw)throw new Error(Q.noPolygonFound);const n=o.canvas.size,a=null!==(e=null==t?void 0:t.x)&&void 0!==e?e:Math.random()*n.width,r=null!==(i=null==t?void 0:t.y)&&void 0!==i?i:Math.random()*n.height;let l=!1;for(let t=0,e=this.raw.length-1;t<this.raw.length;e=t++){const i=this.raw[t],o=this.raw[e];i.y>r!=o.y>r&&a<(o.x-i.x)*(r-i.y)/(o.y-i.y)+i.x&&(l=!l);}return s.type===Ki.inside?l:s.type===Ki.outside&&!l}parseSvgPath(t,e){var i,o,s;const n=null!=e&&e;if(void 0!==this.paths&&!n)return this.raw;const a=this.container,r=this.options,l=(new DOMParser).parseFromString(t,"image/svg+xml"),c=l.getElementsByTagName("svg")[0];let d=c.getElementsByTagName("path");d.length||(d=l.getElementsByTagName("path")),this.paths=[];for(let t=0;t<d.length;t++){const e=d.item(t);e&&this.paths.push({element:e,length:e.getTotalLength()});}const h=a.retina.pixelRatio,u=r.scale/h;this.dimension.width=parseFloat(null!==(i=c.getAttribute("width"))&&void 0!==i?i:"0")*u,this.dimension.height=parseFloat(null!==(o=c.getAttribute("height"))&&void 0!==o?o:"0")*u;const v=null!==(s=r.position)&&void 0!==s?s:{x:50,y:50};return this.offset={x:a.canvas.size.width*v.x/(100*h)-this.dimension.width/2,y:a.canvas.size.height*v.y/(100*h)-this.dimension.height/2},function(t,e,i){const o=[];for(const s of t){const t=s.element.pathSegList,n=t.numberOfItems,a={x:0,y:0};for(let s=0;s<n;s++){const n=t.getItem(s),r=window.SVGPathSeg;switch(n.pathSegType){case r.PATHSEG_MOVETO_ABS:case r.PATHSEG_LINETO_ABS:case r.PATHSEG_CURVETO_CUBIC_ABS:case r.PATHSEG_CURVETO_QUADRATIC_ABS:case r.PATHSEG_ARC_ABS:case r.PATHSEG_CURVETO_CUBIC_SMOOTH_ABS:case r.PATHSEG_CURVETO_QUADRATIC_SMOOTH_ABS:{const t=n;a.x=t.x,a.y=t.y;break}case r.PATHSEG_LINETO_HORIZONTAL_ABS:a.x=n.x;break;case r.PATHSEG_LINETO_VERTICAL_ABS:a.y=n.y;break;case r.PATHSEG_LINETO_REL:case r.PATHSEG_MOVETO_REL:case r.PATHSEG_CURVETO_CUBIC_REL:case r.PATHSEG_CURVETO_QUADRATIC_REL:case r.PATHSEG_ARC_REL:case r.PATHSEG_CURVETO_CUBIC_SMOOTH_REL:case r.PATHSEG_CURVETO_QUADRATIC_SMOOTH_REL:{const t=n;a.x+=t.x,a.y+=t.y;break}case r.PATHSEG_LINETO_HORIZONTAL_REL:a.x+=n.x;break;case r.PATHSEG_LINETO_VERTICAL_REL:a.y+=n.y;break;case r.PATHSEG_UNKNOWN:case r.PATHSEG_CLOSEPATH:continue}o.push({x:a.x*e+i.x,y:a.y*e+i.y});}}return o}(this.paths,u,this.offset)}downloadSvgPath(t,e){return ao(this,void 0,void 0,(function*(){const i=this.options,o=t||i.url,s=null!=e&&e;if(!o||void 0!==this.paths&&!s)return this.raw;const n=yield fetch(o);if(!n.ok)throw new Error("tsParticles Error - Error occurred during polygon mask download");return this.parseSvgPath(yield n.text(),e)}))}drawPoints(){if(this.raw)for(const t of this.raw)this.container.particles.addParticle({x:t.x,y:t.y});}randomPoint(){const t=this.container,e=this.options;let i;if(e.type===Ki.inline)switch(e.inline.arrangement){case Qi.randomPoint:i=this.getRandomPoint();break;case Qi.randomLength:i=this.getRandomPointByLength();break;case Qi.equidistant:i=this.getEquidistantPointByIndex(t.particles.count);break;case Qi.onePerPoint:case Qi.perPoint:default:i=this.getPointByIndex(t.particles.count);}else i={x:Math.random()*t.canvas.size.width,y:Math.random()*t.canvas.size.height};return this.checkInsidePolygon(i)?i:this.randomPoint()}getRandomPoint(){if(!this.raw||!this.raw.length)throw new Error(Q.noPolygonDataLoaded);const t=J.itemFromArray(this.raw);return {x:t.x,y:t.y}}getRandomPointByLength(){var t,e,i;const o=this.options;if(!this.raw||!this.raw.length||!(null===(t=this.paths)||void 0===t?void 0:t.length))throw new Error(Q.noPolygonDataLoaded);const s=J.itemFromArray(this.paths),n=Math.floor(Math.random()*s.length)+1,a=s.element.getPointAtLength(n);return {x:a.x*o.scale+((null===(e=this.offset)||void 0===e?void 0:e.x)||0),y:a.y*o.scale+((null===(i=this.offset)||void 0===i?void 0:i.y)||0)}}getEquidistantPointByIndex(t){var e,i,o,s,n,a,r;const l=this.container.actualOptions,c=this.options;if(!this.raw||!this.raw.length||!(null===(e=this.paths)||void 0===e?void 0:e.length))throw new Error(Q.noPolygonDataLoaded);let d,h=0;const u=this.paths.reduce(((t,e)=>t+e.length),0)/l.particles.number.value;for(const e of this.paths){const i=u*t-h;if(i<=e.length){d=e.element.getPointAtLength(i);break}h+=e.length;}return {x:(null!==(i=null==d?void 0:d.x)&&void 0!==i?i:0)*c.scale+(null!==(s=null===(o=this.offset)||void 0===o?void 0:o.x)&&void 0!==s?s:0),y:(null!==(n=null==d?void 0:d.y)&&void 0!==n?n:0)*c.scale+(null!==(r=null===(a=this.offset)||void 0===a?void 0:a.y)&&void 0!==r?r:0)}}getPointByIndex(t){if(!this.raw||!this.raw.length)throw new Error(Q.noPolygonDataLoaded);const e=this.raw[t%this.raw.length];return {x:e.x,y:e.y}}createPath2D(){var t,e;const i=this.options;if(this.path2DSupported&&(null===(t=this.paths)||void 0===t?void 0:t.length))for(const t of this.paths){const o=null===(e=t.element)||void 0===e?void 0:e.getAttribute("d");if(o){const e=new Path2D(o),s=document.createElementNS("http://www.w3.org/2000/svg","svg").createSVGMatrix(),n=new Path2D,a=s.scale(i.scale);n.addPath?(n.addPath(e,a),t.path2d=n):delete t.path2d;}else delete t.path2d;!t.path2d&&this.raw&&(t.path2d=new Path2D,t.path2d.moveTo(this.raw[0].x,this.raw[0].y),this.raw.forEach(((e,i)=>{var o;i>0&&(null===(o=t.path2d)||void 0===o||o.lineTo(e.x,e.y));})),t.path2d.closePath());}}initRawData(t){return ao(this,void 0,void 0,(function*(){const e=this.options;if(e.url)this.raw=yield this.downloadSvgPath(e.url,t);else if(e.data){const i=e.data;let o;if("string"!=typeof i){const t=i.path instanceof Array?i.path.map((t=>`<path d="${t}" />`)).join(""):`<path d="${i.path}" />`;o=`<svg ${'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"'} width="${i.size.width}" height="${i.size.height}">${t}</svg>`;}else o=i;this.raw=this.parseSvgPath(o,t);}this.createPath2D();}))}}const uo=new class{constructor(){this.id="polygonMask";}getPlugin(t){return new ho(t)}needsPlugin(t){var e,i,o;return null!==(i=null===(e=null==t?void 0:t.polygon)||void 0===e?void 0:e.enable)&&void 0!==i?i:void 0!==(null===(o=null==t?void 0:t.polygon)||void 0===o?void 0:o.type)&&t.polygon.type!==Ki.none}loadOptions(t,e){if(!this.needsPlugin(e))return;const i=t;let o=i.polygon;void 0===(null==o?void 0:o.load)&&(i.polygon=o=new no),o.load(null==e?void 0:e.polygon);}};const vo=new class extends class{constructor(){Ei.set(this,void 0),Ii(this,Ei,!1);const t=new S,e=new mt,i=new bt;vt.addShapeDrawer(W.line,new wt),vt.addShapeDrawer(W.circle,new xt),vt.addShapeDrawer(W.edge,t),vt.addShapeDrawer(W.square,t),vt.addShapeDrawer(W.triangle,new Pt),vt.addShapeDrawer(W.star,new Mt),vt.addShapeDrawer(W.polygon,new Rt),vt.addShapeDrawer(W.char,e),vt.addShapeDrawer(W.character,e),vt.addShapeDrawer(W.image,i),vt.addShapeDrawer(W.images,i);}init(){Fi(this,Ei)||Ii(this,Ei,!0);}loadFromArray(t,e,i){return Oi(this,void 0,void 0,(function*(){return Ti.load(t,e,i)}))}load(t,e){return Oi(this,void 0,void 0,(function*(){return Ti.load(t,e)}))}set(t,e,i){return Oi(this,void 0,void 0,(function*(){return Ti.set(t,e,i)}))}loadJSON(t,e,i){return Ti.loadJSON(t,e,i)}setOnClickHandler(t){Ti.setOnClickHandler(t);}dom(){return Ti.dom()}domItem(t){return Ti.domItem(t)}addShape(t,e,i,o,s){let n;n="function"==typeof e?{afterEffect:o,destroy:s,draw:e,init:i}:e,vt.addShapeDrawer(t,n);}addPreset(t,e){vt.addPreset(t,e);}addPlugin(t){vt.addPlugin(t);}addPathGenerator(t,e){vt.addPathGenerator(t,e);}}{constructor(){super(),this.addPlugin(qi),this.addPlugin(Ji),this.addPlugin(uo);}};function po(e){let i;return {c(){var t;t="div",i=document.createElement(t),r(i,"id",e[0]);},m(t,e){!function(t,e,i){t.insertBefore(e,i||null);}(t,i,e);},p(t,[e]){1&e&&r(i,"id",t[0]);},i:t,o:t,d(t){t&&a(i);}}}vo.init(),(t=>{t.dom();})(vo);function yo(t,e,i){let{options:o={}}=e,{url:s=""}=e,{id:n="tsparticles"}=e;const a=h();let r=n;var l;return l=()=>{if(vo.init(),a("particlesInit",vo),r){const t=vo.dom().find((t=>t.id===r));t&&t.destroy();}if(n){const t=t=>{a("particlesLoaded",{particles:t}),r=n;};s?vo.loadJSON(n,s).then(t):o?vo.load(n,o).then(t):console.error("You must specify options or url to load tsParticles");}else a("particlesLoaded",{particles:void 0});},d().$$.after_update.push(l),t.$$set=t=>{"options"in t&&i(1,o=t.options),"url"in t&&i(2,s=t.url),"id"in t&&i(0,n=t.id);},[n,o,s]}class Particles extends class{$destroy(){!function(t,e){const i=t.$$;null!==i.fragment&&(o(i.on_destroy),i.fragment&&i.fragment.d(e),i.on_destroy=i.fragment=null,i.ctx=[]);}(this,1),this.$destroy=t;}$on(t,e){const i=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return i.push(e),()=>{const t=i.indexOf(e);-1!==t&&i.splice(t,1);}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1);}}{constructor(t){super(),R(this,t,yo,po,n,{options:1,url:2,id:0});}get options(){return this.$$.ctx[1]}set options(t){this.$set({options:t}),x();}get url(){return this.$$.ctx[2]}set url(t){this.$set({url:t}),x();}get id(){return this.$$.ctx[0]}set id(t){this.$set({id:t}),x();}}

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

    // (75:4) <Link to="/profile">
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

    // (76:4) <Link to="/generate">
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

    // (77:4) <Link to="/browse">
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

    // (81:4) {:else}
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

    			if (dirty & /*$$scope*/ 64) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
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

    // (78:4) {#if authState.isAuth || isAuth}
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
    				dispose = listen(button, "click", /*logout*/ ctx[4]);
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

    // (82:6) <Link to="/login">
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

    // (83:6) <Link to="/register">
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

    // (72:0) <Router>
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
    			attr(nav, "class", "navbar svelte-12khe55");
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

    			if (dirty & /*$$scope*/ 64) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);
    			const link3_changes = {};

    			if (dirty & /*$$scope*/ 64) {
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
    	let particles;
    	let t;
    	let router;
    	let current;

    	particles = new Particles({
    			props: { options: /*particlesConfig*/ ctx[3] }
    		});

    	router = new Router({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			create_component(particles.$$.fragment);
    			t = space();
    			create_component(router.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(particles, target, anchor);
    			insert(target, t, anchor);
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope, authState, username, isAuth*/ 71) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(particles.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(particles.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(particles, detaching);
    			if (detaching) detach(t);
    			destroy_component(router, detaching);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let particlesConfig = {
    		fpsLimit: 120,
    		particles: {
    			color: { value: "#000" },
    			links: { enable: true, color: "#000" },
    			move: { enable: true },
    			number: { value: 100 }
    		}
    	};

    	let isAuth = false;
    	let username = "";
    	let authState = {};

    	auth.subscribe(value => {
    		$$invalidate(2, authState = value);
    	});

    	const fetchAuthStatus = async () => {
    		try {
    			const response = await fetch("./api/auth"); // Updated to the get_me endpoint

    			if (response.ok) {
    				const user = await response.json();
    				$$invalidate(0, isAuth = true); // The user is authenticated if the request was successful
    				$$invalidate(1, username = user.email);
    			} else {
    				$$invalidate(0, isAuth = false);
    				$$invalidate(1, username = "");
    			}
    		} catch(error) {
    			console.error("Error fetching authentication status:", error);
    			$$invalidate(0, isAuth = false);
    			$$invalidate(1, username = "");
    		}
    	};

    	const logout = async () => {
    		const response = await fetch("./api/auth", { method: "DELETE" });

    		if (response.ok) {
    			$$invalidate(0, isAuth = false);
    			$$invalidate(1, username = "");
    		}
    	};

    	onMount(fetchAuthStatus);
    	return [isAuth, username, authState, particlesConfig, logout];
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
