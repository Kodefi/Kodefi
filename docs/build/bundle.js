
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
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
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    function create_component(block) {
        block && block.c();
    }
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
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
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
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
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

    /* src/components/Kodefisvg.svelte generated by Svelte v3.35.0 */

    function create_fragment$3(ctx) {
    	let svg;
    	let metadata;
    	let rdf_RDF;
    	let cc_Work;
    	let dc_format;
    	let t0;
    	let dc_type;
    	let dc_title;
    	let g;
    	let text0;
    	let text1;
    	let tspan1;
    	let tspan0;
    	let t1;

    	return {
    		c() {
    			svg = svg_element("svg");
    			metadata = svg_element("metadata");
    			rdf_RDF = svg_element("rdf:RDF");
    			cc_Work = svg_element("cc:Work");
    			dc_format = svg_element("dc:format");
    			t0 = text("image/svg+xml");
    			dc_type = svg_element("dc:type");
    			dc_title = svg_element("dc:title");
    			g = svg_element("g");
    			text0 = svg_element("text");
    			text1 = svg_element("text");
    			tspan1 = svg_element("tspan");
    			tspan0 = svg_element("tspan");
    			t1 = text("Kodefi");
    			attr(dc_type, "rdf:resource", "http://purl.org/dc/dcmitype/StillImage");
    			attr(cc_Work, "rdf:about", "");
    			set_style(text0, "line-height", "1.25");
    			set_style(text0, "shape-inside", "url(#rect835)");
    			set_style(text0, "white-space", "pre");
    			attr(text0, "xml:space", "preserve");
    			attr(tspan0, "fill", /*color*/ ctx[0]);
    			attr(tspan1, "x", "7.6640625");
    			attr(tspan1, "y", "61.447662");
    			attr(text1, "transform", "translate(7.5582 -2.8432)");
    			set_style(text1, "line-height", "1.25");
    			set_style(text1, "shape-inside", "url(#rect841)");
    			set_style(text1, "white-space", "pre");
    			attr(text1, "xml:space", "preserve");
    			attr(g, "transform", "translate(-16.069 -50.561)");
    			attr(g, "font-family", "Trakya-Sans-Alt-500-Regular");
    			attr(g, "font-size", "10.583px");
    			set_style(svg, "color", "red");
    			attr(svg, "width", "27.834mm");
    			attr(svg, "height", "8.2021mm");
    			attr(svg, "version", "1.1");
    			attr(svg, "viewBox", "0 0 27.834 8.2021");
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "xmlns:cc", "http://creativecommons.org/ns#");
    			attr(svg, "xmlns:dc", "http://purl.org/dc/elements/1.1/");
    			attr(svg, "xmlns:rdf", "http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, metadata);
    			append(metadata, rdf_RDF);
    			append(rdf_RDF, cc_Work);
    			append(cc_Work, dc_format);
    			append(dc_format, t0);
    			append(cc_Work, dc_type);
    			append(cc_Work, dc_title);
    			append(svg, g);
    			append(g, text0);
    			append(g, text1);
    			append(text1, tspan1);
    			append(tspan1, tspan0);
    			append(tspan0, t1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { type = "dark" } = $$props;
    	const color = type == "dark" ? "#1e1e24" : "#f7ebe8";

    	$$self.$$set = $$props => {
    		if ("type" in $$props) $$invalidate(1, type = $$props.type);
    	};

    	return [color, type];
    }

    class Kodefisvg extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$3, safe_not_equal, { type: 1 });
    	}
    }

    /* src/components/ButtonPrimary.svelte generated by Svelte v3.35.0 */

    function create_fragment$2(ctx) {
    	let a;

    	let t0_value = (/*icon*/ ctx[2]
    	? `<i class="material-icon ${/*icon_position*/ ctx[3]}"">${/*icon*/ ctx[2]}}</i>`
    	: "") + "";

    	let t0;
    	let t1;
    	let t2;
    	let a_class_value;
    	let a_style_value;

    	return {
    		c() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(/*content*/ ctx[6]);
    			attr(a, "href", /*href*/ ctx[7]);
    			attr(a, "class", a_class_value = "waves-effect waves-" + /*waves*/ ctx[0] + " btn" + (/*size*/ ctx[1] != "medium" ? `-${/*size*/ ctx[1]}` : "") + " " + (/*disabled*/ ctx[4] ? "disabled" : "") + " " + (/*hex_color*/ ctx[9] ? "" : /*color*/ ctx[5]) + " " + (/*float*/ ctx[8] ? /*float*/ ctx[8] : ""));

    			attr(a, "style", a_style_value = /*hex_color*/ ctx[9]
    			? `background-color: ${/*hex_color*/ ctx[9]} !important`
    			: "");
    		},
    		m(target, anchor) {
    			insert(target, a, anchor);
    			append(a, t0);
    			append(a, t1);
    			append(a, t2);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*icon, icon_position*/ 12 && t0_value !== (t0_value = (/*icon*/ ctx[2]
    			? `<i class="material-icon ${/*icon_position*/ ctx[3]}"">${/*icon*/ ctx[2]}}</i>`
    			: "") + "")) set_data(t0, t0_value);

    			if (dirty & /*content*/ 64) set_data(t2, /*content*/ ctx[6]);

    			if (dirty & /*href*/ 128) {
    				attr(a, "href", /*href*/ ctx[7]);
    			}

    			if (dirty & /*waves, size, disabled, hex_color, color, float*/ 819 && a_class_value !== (a_class_value = "waves-effect waves-" + /*waves*/ ctx[0] + " btn" + (/*size*/ ctx[1] != "medium" ? `-${/*size*/ ctx[1]}` : "") + " " + (/*disabled*/ ctx[4] ? "disabled" : "") + " " + (/*hex_color*/ ctx[9] ? "" : /*color*/ ctx[5]) + " " + (/*float*/ ctx[8] ? /*float*/ ctx[8] : ""))) {
    				attr(a, "class", a_class_value);
    			}

    			if (dirty & /*hex_color*/ 512 && a_style_value !== (a_style_value = /*hex_color*/ ctx[9]
    			? `background-color: ${/*hex_color*/ ctx[9]} !important`
    			: "")) {
    				attr(a, "style", a_style_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(a);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { waves = "light" } = $$props;
    	let { size = "medium" } = $$props;
    	let { icon = null } = $$props;
    	let { icon_position = "left" } = $$props;
    	let { disabled = false } = $$props;
    	let { color = "teal" } = $$props;
    	let { content } = $$props;
    	let { href } = $$props;
    	let { float = null } = $$props;
    	let { hex_color = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("waves" in $$props) $$invalidate(0, waves = $$props.waves);
    		if ("size" in $$props) $$invalidate(1, size = $$props.size);
    		if ("icon" in $$props) $$invalidate(2, icon = $$props.icon);
    		if ("icon_position" in $$props) $$invalidate(3, icon_position = $$props.icon_position);
    		if ("disabled" in $$props) $$invalidate(4, disabled = $$props.disabled);
    		if ("color" in $$props) $$invalidate(5, color = $$props.color);
    		if ("content" in $$props) $$invalidate(6, content = $$props.content);
    		if ("href" in $$props) $$invalidate(7, href = $$props.href);
    		if ("float" in $$props) $$invalidate(8, float = $$props.float);
    		if ("hex_color" in $$props) $$invalidate(9, hex_color = $$props.hex_color);
    	};

    	return [
    		waves,
    		size,
    		icon,
    		icon_position,
    		disabled,
    		color,
    		content,
    		href,
    		float,
    		hex_color
    	];
    }

    class ButtonPrimary extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance, create_fragment$2, safe_not_equal, {
    			waves: 0,
    			size: 1,
    			icon: 2,
    			icon_position: 3,
    			disabled: 4,
    			color: 5,
    			content: 6,
    			href: 7,
    			float: 8,
    			hex_color: 9
    		});
    	}
    }

    /* src/components/Navbar.svelte generated by Svelte v3.35.0 */

    function create_fragment$1(ctx) {
    	let nav;
    	let div;
    	let a0;
    	let kodefisvg;
    	let t0;
    	let ul;
    	let li0;
    	let t2;
    	let li1;
    	let t4;
    	let li2;
    	let t6;
    	let li3;
    	let t8;
    	let li4;
    	let buttonprimary;
    	let current;
    	kodefisvg = new Kodefisvg({ props: { type: "dark" } });

    	buttonprimary = new ButtonPrimary({
    			props: {
    				content: "Contacto",
    				hex_color: "#e54b4b"
    			}
    		});

    	return {
    		c() {
    			nav = element("nav");
    			div = element("div");
    			a0 = element("a");
    			create_component(kodefisvg.$$.fragment);
    			t0 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.innerHTML = `<a href="sass.html" class="svelte-fdg65v">Servicios</a>`;
    			t2 = space();
    			li1 = element("li");
    			li1.innerHTML = `<a href="badges.html" class="svelte-fdg65v">Blog</a>`;
    			t4 = space();
    			li2 = element("li");
    			li2.innerHTML = `<a href="badges.html" class="svelte-fdg65v">Open Source</a>`;
    			t6 = space();
    			li3 = element("li");
    			li3.innerHTML = `<a href="collapsible.html" class="svelte-fdg65v">Equipo</a>`;
    			t8 = space();
    			li4 = element("li");
    			create_component(buttonprimary.$$.fragment);
    			attr(a0, "href", "/");
    			attr(a0, "class", "brand-logo svelte-fdg65v");
    			attr(li0, "class", "hide-on-med-and-down");
    			attr(li1, "class", "hide-on-med-and-down desactivado svelte-fdg65v");
    			attr(li2, "class", "hide-on-med-and-down desactivado svelte-fdg65v");
    			attr(li3, "class", "hide-on-med-and-down");
    			attr(li4, "class", "hide-on-small-only");
    			attr(ul, "id", "nav-mobile");
    			attr(ul, "class", "right");
    			attr(div, "class", "nav-wrapper");
    			attr(nav, "class", "transparent svelte-fdg65v");
    		},
    		m(target, anchor) {
    			insert(target, nav, anchor);
    			append(nav, div);
    			append(div, a0);
    			mount_component(kodefisvg, a0, null);
    			append(div, t0);
    			append(div, ul);
    			append(ul, li0);
    			append(ul, t2);
    			append(ul, li1);
    			append(ul, t4);
    			append(ul, li2);
    			append(ul, t6);
    			append(ul, li3);
    			append(ul, t8);
    			append(ul, li4);
    			mount_component(buttonprimary, li4, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(kodefisvg.$$.fragment, local);
    			transition_in(buttonprimary.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(kodefisvg.$$.fragment, local);
    			transition_out(buttonprimary.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(nav);
    			destroy_component(kodefisvg);
    			destroy_component(buttonprimary);
    		}
    	};
    }

    class Navbar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/App.svelte generated by Svelte v3.35.0 */

    function create_fragment(ctx) {
    	let header;
    	let div0;
    	let navbar;
    	let t0;
    	let div1;
    	let current;
    	navbar = new Navbar({});

    	return {
    		c() {
    			header = element("header");
    			div0 = element("div");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			div1.textContent = "a";
    			attr(div0, "class", "container");
    			attr(header, "class", "svelte-yowavg");
    			attr(div1, "class", "main");
    		},
    		m(target, anchor) {
    			insert(target, header, anchor);
    			append(header, div0);
    			mount_component(navbar, div0, null);
    			insert(target, t0, anchor);
    			insert(target, div1, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(navbar.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(header);
    			destroy_component(navbar);
    			if (detaching) detach(t0);
    			if (detaching) detach(div1);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({
        target: document.getElementById("app")
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
