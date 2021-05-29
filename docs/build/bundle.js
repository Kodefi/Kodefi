
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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

    /* src/components/ButtonPrimary.svelte generated by Svelte v3.35.0 */

    function create_fragment$b(ctx) {
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

    			attr(a, "style", a_style_value = (/*hex_color*/ ctx[9]
    			? `background-color: ${/*hex_color*/ ctx[9]} !important`
    			: "") + "; " + /*style*/ ctx[10]);
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

    			if (dirty & /*hex_color, style*/ 1536 && a_style_value !== (a_style_value = (/*hex_color*/ ctx[9]
    			? `background-color: ${/*hex_color*/ ctx[9]} !important`
    			: "") + "; " + /*style*/ ctx[10])) {
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

    function instance$5($$self, $$props, $$invalidate) {
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
    	let { style = null } = $$props;

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
    		if ("style" in $$props) $$invalidate(10, style = $$props.style);
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
    		hex_color,
    		style
    	];
    }

    class ButtonPrimary extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$5, create_fragment$b, safe_not_equal, {
    			waves: 0,
    			size: 1,
    			icon: 2,
    			icon_position: 3,
    			disabled: 4,
    			color: 5,
    			content: 6,
    			href: 7,
    			float: 8,
    			hex_color: 9,
    			style: 10
    		});
    	}
    }

    /* src/components/Card.svelte generated by Svelte v3.35.0 */

    function create_if_block(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	return {
    		c() {
    			div = element("div");
    			img = element("img");
    			if (img.src !== (img_src_value = /*image_src*/ ctx[2])) attr(img, "src", img_src_value);
    			attr(img, "alt", /*image_alt*/ ctx[3]);
    			attr(div, "class", "card-image");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, img);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*image_src*/ 4 && img.src !== (img_src_value = /*image_src*/ ctx[2])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*image_alt*/ 8) {
    				attr(img, "alt", /*image_alt*/ ctx[3]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$a(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let span;
    	let t1;
    	let p;
    	let if_block = /*image_src*/ ctx[2] && create_if_block(ctx);

    	return {
    		c() {
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			span = element("span");
    			t1 = space();
    			p = element("p");
    			attr(span, "class", "card-title");
    			attr(div0, "class", "card-content center-align svelte-12goin8");
    			set_style(div1, "--text-color", /*text_color*/ ctx[4] || "initial");
    			attr(div1, "class", "card svelte-12goin8");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			if (if_block) if_block.m(div1, null);
    			append(div1, t0);
    			append(div1, div0);
    			append(div0, span);
    			span.innerHTML = /*title*/ ctx[0];
    			append(div0, t1);
    			append(div0, p);
    			p.innerHTML = /*content*/ ctx[1];
    		},
    		p(ctx, [dirty]) {
    			if (/*image_src*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div1, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*title*/ 1) span.innerHTML = /*title*/ ctx[0];			if (dirty & /*content*/ 2) p.innerHTML = /*content*/ ctx[1];
    			if (dirty & /*text_color*/ 16) {
    				set_style(div1, "--text-color", /*text_color*/ ctx[4] || "initial");
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { title } = $$props;
    	let { content } = $$props;
    	let { image_src = "" } = $$props;
    	let { image_alt = "" } = $$props;
    	let { text_color = "" } = $$props;

    	$$self.$$set = $$props => {
    		if ("title" in $$props) $$invalidate(0, title = $$props.title);
    		if ("content" in $$props) $$invalidate(1, content = $$props.content);
    		if ("image_src" in $$props) $$invalidate(2, image_src = $$props.image_src);
    		if ("image_alt" in $$props) $$invalidate(3, image_alt = $$props.image_alt);
    		if ("text_color" in $$props) $$invalidate(4, text_color = $$props.text_color);
    	};

    	return [title, content, image_src, image_alt, text_color];
    }

    class Card extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$4, create_fragment$a, safe_not_equal, {
    			title: 0,
    			content: 1,
    			image_src: 2,
    			image_alt: 3,
    			text_color: 4
    		});
    	}
    }

    /* src/sections/ComoLoHacemos.svelte generated by Svelte v3.35.0 */

    function create_fragment$9(ctx) {
    	let div4;
    	let div0;
    	let card0;
    	let t0;
    	let div1;
    	let card1;
    	let t1;
    	let div2;
    	let card2;
    	let t2;
    	let div3;
    	let card3;
    	let current;

    	card0 = new Card({
    			props: {
    				title: "Escuchamos tus necesidades",
    				content: "Cuéntanos acerca de tu proyecto, <wbr>nuestro equipo esta capacitado para <wbr>orientarte y resolver tus inquietudes<wbr> desde el principio tu idea <wbr>hasta la finalización del proyecto.",
    				image_src: "resources/consulting.svg",
    				image_alt: "Te escuchamos",
    				text_color: "#fff7f2"
    			}
    		});

    	card1 = new Card({
    			props: {
    				title: "Realizamos una propuesta",
    				content: "Tras escuchar tus ideas, <wbr>nos dedicaremos a evaluar distintas opciones, <wbr>aquellas que sean las más eficiente en cuanto a tiempo, <wbr>desarrollo y beneficio para ti. <wbr>Nuestro objetivo es darte la mejor solución para tus proyectos.",
    				image_src: "resources/presentation.svg",
    				image_alt: "Proponemos",
    				text_color: "#fff7f2"
    			}
    		});

    	card2 = new Card({
    			props: {
    				title: "Analizamos en conjunto",
    				content: "Una vez hemos encontrado una propuesta adecuada <wbr>comenzamos a trabajar junto a ti, <wbr>desarrollando una estrategia juntos <wbr>e iterando en el desarrollo, <wbr>ofreciendo soluciones inteligentes <wbr>para alcanzar el objetivo y concretar tus ideas.",
    				image_src: "resources/meeting.svg",
    				image_alt: "Analizamos",
    				text_color: "#fff7f2"
    			}
    		});

    	card3 = new Card({
    			props: {
    				title: "Desarrollamos <wbr>y entregamos",
    				content: "Una vez lograda una estrategia clara y eficiente, <wbr>desarrollaremos tu producto, <wbr>coordinaremos la publicación <wbr>y haremos un seguimiento constante del resultado, <wbr>asegurándonos que todo funcione <wbr>correctamente.",
    				image_src: "resources/launch.svg",
    				image_alt: "Entregamos",
    				text_color: "#fff7f2"
    			}
    		});

    	return {
    		c() {
    			div4 = element("div");
    			div0 = element("div");
    			create_component(card0.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(card1.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(card2.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			create_component(card3.$$.fragment);
    			attr(div0, "class", "col s10 m4 l3 l1440 offset-s1 offset-m2 offset-l1440 svelte-89pt0");
    			attr(div1, "class", "col s10 m4 l3 l1440 offset-s1 svelte-89pt0");
    			attr(div2, "class", "col s10 m4 l3 l1440 offset-m2 offset-s1 svelte-89pt0");
    			attr(div3, "class", "col s10 m4 l3 l1440 offset-s1 svelte-89pt0");
    			attr(div4, "class", "row svelte-89pt0");
    		},
    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, div0);
    			mount_component(card0, div0, null);
    			append(div4, t0);
    			append(div4, div1);
    			mount_component(card1, div1, null);
    			append(div4, t1);
    			append(div4, div2);
    			mount_component(card2, div2, null);
    			append(div4, t2);
    			append(div4, div3);
    			mount_component(card3, div3, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(card0.$$.fragment, local);
    			transition_in(card1.$$.fragment, local);
    			transition_in(card2.$$.fragment, local);
    			transition_in(card3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(card0.$$.fragment, local);
    			transition_out(card1.$$.fragment, local);
    			transition_out(card2.$$.fragment, local);
    			transition_out(card3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div4);
    			destroy_component(card0);
    			destroy_component(card1);
    			destroy_component(card2);
    			destroy_component(card3);
    		}
    	};
    }

    class ComoLoHacemos extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$9, safe_not_equal, {});
    	}
    }

    /* src/components/svgs/Kodefi.svelte generated by Svelte v3.35.0 */

    function create_fragment$8(ctx) {
    	let svg;
    	let g1;
    	let g0;
    	let path0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;

    	return {
    		c() {
    			svg = svg_element("svg");
    			g1 = svg_element("g");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			attr(path0, "d", "m36.332 60.211h-1.0795l-1.8097-2.7411-1.5981 2.6882q-0.127 0.21167-0.39158 0.21167-0.17992 0-0.3175-0.127-0.127-0.127-0.127-0.3175v-6.9109h0.89958v5.334l3.1538-5.334h1.0477l-2.1484 3.5983z");
    			attr(path1, "d", "m39.147 60.37q-1.0795 0-1.8415-0.762-0.762-0.762-0.762-1.8415 0-1.0795 0.762-1.8415 0.762-0.762 1.8415-0.762 1.0689 0 1.8309 0.762 0.77258 0.77258 0.77258 1.8415 0 1.0689-0.77258 1.8415-0.762 0.762-1.8309 0.762zm1.2594-3.8629q-0.51858-0.52916-1.2594-0.52916t-1.27 0.52916q-0.51858 0.51858-0.51858 1.2594t0.51858 1.27q0.52916 0.51858 1.27 0.51858t1.2594-0.51858q0.52916-0.52916 0.52916-1.27t-0.52916-1.2594z");
    			attr(path2, "d", "m46.989 52.168h0.81491v5.5986q0 1.0689-0.77258 1.8415-0.762 0.762-1.8309 0.762-1.0795 0-1.8415-0.762-0.762-0.762-0.762-1.8415 0-1.0795 0.6985-1.8415 0.70908-0.762 1.7039-0.762 0.61383 0 1.1324 0.3175 0.52916 0.30692 0.85725 0.83608zm-3.0586 6.8686q0.52916 0.51858 1.27 0.51858t1.2594-0.51858q0.52916-0.52916 0.52916-1.27t-0.52916-1.2594q-0.51858-0.52916-1.2594-0.52916t-1.27 0.52916q-0.51858 0.51858-0.51858 1.2594t0.51858 1.27z");
    			attr(path3, "d", "m53.033 58.761 0.66675 0.47625q-0.39158 0.52916-0.99483 0.83608-0.60325 0.29633-1.2806 0.29633-1.1324 0-1.9367-0.75141-0.81491-0.762-0.81491-1.8521 0-1.0689 0.70908-1.8309 0.74083-0.77258 1.7568-0.77258 1.0372 0 1.7568 0.77258 0.71966 0.75142 0.71966 1.8309 0 0.20108-0.03175 0.41275h-4.0428q0.14817 0.59266 0.66675 0.98425 0.52916 0.39158 1.2171 0.39158 0.48683 0 0.91016-0.21167 0.43392-0.21167 0.6985-0.58208zm-0.86783-2.3918q-0.4445-0.39158-1.0266-0.39158-0.58208 0-1.0372 0.39158-0.4445 0.39158-0.5715 0.99483h3.2279q-0.13758-0.60325-0.59266-0.99483z");
    			attr(path4, "d", "m57.107 52.983q-0.52916 0-0.89958 0.381-0.37042 0.37042-0.37042 0.889v1.0689h1.27v0.81491h-1.27v4.0746h-0.81491v-4.0746h-0.84666v-0.81491h0.84666v-1.0689q0-0.86783 0.60325-1.4711 0.61383-0.61383 1.4817-0.61383z");
    			attr(path5, "d", "m58.663 55.322v4.8895h-0.81491v-4.8895zm0.01058-2.0532q0.16933 0.16933 0.16933 0.41275t-0.16933 0.41275q-0.16933 0.16933-0.41275 0.16933-0.24342 0-0.41275-0.16933-0.16933-0.16933-0.16933-0.41275t0.16933-0.41275 0.41275-0.16933q0.24342 0 0.41275 0.16933z");
    			attr(g0, "fill", /*color*/ ctx[1]);
    			attr(g0, "stroke-width", ".26458");
    			attr(g0, "aria-label", "Kodefi");
    			attr(g1, "transform", "translate(-31.009 -52.168)");
    			attr(svg, "style", /*style*/ ctx[0]);
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
    			append(svg, g1);
    			append(g1, g0);
    			append(g0, path0);
    			append(g0, path1);
    			append(g0, path2);
    			append(g0, path3);
    			append(g0, path4);
    			append(g0, path5);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*style*/ 1) {
    				attr(svg, "style", /*style*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { type = "dark" } = $$props;
    	let { style = null } = $$props;
    	const color = type == "dark" ? "#1e1e24" : "#fff7f2";

    	$$self.$$set = $$props => {
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    	};

    	return [style, color, type];
    }

    class Kodefi extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$8, safe_not_equal, { type: 2, style: 0 });
    	}
    }

    /* src/components/Navbar.svelte generated by Svelte v3.35.0 */

    function create_fragment$7(ctx) {
    	let div1;
    	let nav;
    	let div0;
    	let a0;
    	let kodefi;
    	let t0;
    	let ul;
    	let li0;
    	let t2;
    	let li1;
    	let t4;
    	let li2;
    	let t6;
    	let li3;
    	let buttonprimary;
    	let current;

    	kodefi = new Kodefi({
    			props: {
    				style: "vertical-align:middle;",
    				type: "light"
    			}
    		});

    	buttonprimary = new ButtonPrimary({
    			props: {
    				href: "#contacto",
    				content: "Contacto",
    				hex_color: "#669fa4"
    			}
    		});

    	return {
    		c() {
    			div1 = element("div");
    			nav = element("nav");
    			div0 = element("div");
    			a0 = element("a");
    			create_component(kodefi.$$.fragment);
    			t0 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.innerHTML = `<a href="#servicios" class="svelte-1fv27n5">Servicios</a>`;
    			t2 = space();
    			li1 = element("li");
    			li1.innerHTML = `<a href="/" class="svelte-1fv27n5">Blog</a>`;
    			t4 = space();
    			li2 = element("li");
    			li2.innerHTML = `<a target="_blank" href="https://github.com/Kodefi" class="svelte-1fv27n5">Open Source</a>`;
    			t6 = space();
    			li3 = element("li");
    			create_component(buttonprimary.$$.fragment);
    			attr(a0, "href", "/");
    			attr(a0, "class", "brand-logo svelte-1fv27n5");
    			attr(li0, "class", "hide-on-med-and-down");
    			attr(li1, "class", "hide-on-med-and-down desactivado svelte-1fv27n5");
    			attr(li2, "class", "hide-on-med-and-down");
    			attr(li3, "class", "hide-on-small-only");
    			attr(ul, "id", "nav-mobile");
    			attr(ul, "class", "right");
    			attr(div0, "class", "nav-wrapper");
    			attr(nav, "class", "svelte-1fv27n5");
    			attr(div1, "class", "navbar-fixed");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, nav);
    			append(nav, div0);
    			append(div0, a0);
    			mount_component(kodefi, a0, null);
    			append(div0, t0);
    			append(div0, ul);
    			append(ul, li0);
    			append(ul, t2);
    			append(ul, li1);
    			append(ul, t4);
    			append(ul, li2);
    			append(ul, t6);
    			append(ul, li3);
    			mount_component(buttonprimary, li3, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(kodefi.$$.fragment, local);
    			transition_in(buttonprimary.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(kodefi.$$.fragment, local);
    			transition_out(buttonprimary.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_component(kodefi);
    			destroy_component(buttonprimary);
    		}
    	};
    }

    class Navbar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$7, safe_not_equal, {});
    	}
    }

    /* src/components/svgs/WebDevelopment.svelte generated by Svelte v3.35.0 */

    function create_fragment$6(ctx) {
    	let svg;
    	let g;
    	let path0;
    	let rect0;
    	let path1;
    	let path2;
    	let path3;
    	let path4;
    	let path5;
    	let path6;
    	let path7;
    	let path8;
    	let path9;
    	let rect1;
    	let path10;
    	let path11;
    	let path12;
    	let path13;
    	let path14;
    	let rect2;
    	let path15;
    	let circle0;
    	let circle1;
    	let circle2;
    	let path16;
    	let path17;
    	let path18;
    	let path19;
    	let path20;
    	let path21;
    	let path22;
    	let path23;
    	let path24;
    	let path25;
    	let path26;
    	let path27;
    	let rect3;
    	let path28;
    	let circle3;
    	let path29;
    	let path30;
    	let path31;
    	let path32;
    	let path33;
    	let path34;
    	let path35;
    	let path36;
    	let path37;
    	let path38;
    	let path39;
    	let path40;
    	let path41;
    	let path42;
    	let ellipse0;
    	let path43;
    	let path44;
    	let path45;
    	let path46;
    	let path47;
    	let path48;
    	let path49;
    	let path50;
    	let path51;
    	let path52;
    	let path53;
    	let path54;
    	let path55;
    	let path56;
    	let path57;
    	let path58;
    	let path59;
    	let path60;
    	let path61;
    	let path62;
    	let path63;
    	let path64;
    	let path65;
    	let path66;
    	let path67;
    	let path68;
    	let path69;
    	let path70;
    	let path71;
    	let path72;
    	let path73;
    	let path74;
    	let path75;
    	let path76;
    	let path77;
    	let path78;
    	let path79;
    	let path80;
    	let path81;
    	let path82;
    	let ellipse1;
    	let path83;
    	let path84;
    	let path85;
    	let path86;
    	let path87;
    	let line0;
    	let path88;
    	let line1;
    	let path89;
    	let path90;
    	let path91;

    	return {
    		c() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			rect0 = svg_element("rect");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			path3 = svg_element("path");
    			path4 = svg_element("path");
    			path5 = svg_element("path");
    			path6 = svg_element("path");
    			path7 = svg_element("path");
    			path8 = svg_element("path");
    			path9 = svg_element("path");
    			rect1 = svg_element("rect");
    			path10 = svg_element("path");
    			path11 = svg_element("path");
    			path12 = svg_element("path");
    			path13 = svg_element("path");
    			path14 = svg_element("path");
    			rect2 = svg_element("rect");
    			path15 = svg_element("path");
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			path16 = svg_element("path");
    			path17 = svg_element("path");
    			path18 = svg_element("path");
    			path19 = svg_element("path");
    			path20 = svg_element("path");
    			path21 = svg_element("path");
    			path22 = svg_element("path");
    			path23 = svg_element("path");
    			path24 = svg_element("path");
    			path25 = svg_element("path");
    			path26 = svg_element("path");
    			path27 = svg_element("path");
    			rect3 = svg_element("rect");
    			path28 = svg_element("path");
    			circle3 = svg_element("circle");
    			path29 = svg_element("path");
    			path30 = svg_element("path");
    			path31 = svg_element("path");
    			path32 = svg_element("path");
    			path33 = svg_element("path");
    			path34 = svg_element("path");
    			path35 = svg_element("path");
    			path36 = svg_element("path");
    			path37 = svg_element("path");
    			path38 = svg_element("path");
    			path39 = svg_element("path");
    			path40 = svg_element("path");
    			path41 = svg_element("path");
    			path42 = svg_element("path");
    			ellipse0 = svg_element("ellipse");
    			path43 = svg_element("path");
    			path44 = svg_element("path");
    			path45 = svg_element("path");
    			path46 = svg_element("path");
    			path47 = svg_element("path");
    			path48 = svg_element("path");
    			path49 = svg_element("path");
    			path50 = svg_element("path");
    			path51 = svg_element("path");
    			path52 = svg_element("path");
    			path53 = svg_element("path");
    			path54 = svg_element("path");
    			path55 = svg_element("path");
    			path56 = svg_element("path");
    			path57 = svg_element("path");
    			path58 = svg_element("path");
    			path59 = svg_element("path");
    			path60 = svg_element("path");
    			path61 = svg_element("path");
    			path62 = svg_element("path");
    			path63 = svg_element("path");
    			path64 = svg_element("path");
    			path65 = svg_element("path");
    			path66 = svg_element("path");
    			path67 = svg_element("path");
    			path68 = svg_element("path");
    			path69 = svg_element("path");
    			path70 = svg_element("path");
    			path71 = svg_element("path");
    			path72 = svg_element("path");
    			path73 = svg_element("path");
    			path74 = svg_element("path");
    			path75 = svg_element("path");
    			path76 = svg_element("path");
    			path77 = svg_element("path");
    			path78 = svg_element("path");
    			path79 = svg_element("path");
    			path80 = svg_element("path");
    			path81 = svg_element("path");
    			path82 = svg_element("path");
    			ellipse1 = svg_element("ellipse");
    			path83 = svg_element("path");
    			path84 = svg_element("path");
    			path85 = svg_element("path");
    			path86 = svg_element("path");
    			path87 = svg_element("path");
    			line0 = svg_element("line");
    			path88 = svg_element("path");
    			line1 = svg_element("line");
    			path89 = svg_element("path");
    			path90 = svg_element("path");
    			path91 = svg_element("path");
    			attr(path0, "d", "M356.5,231.33H43.5a.46.46,0,0,1-.46-.46.47.47,0,0,1,.46-.46h313a.47.47,0,0,1,.46.46A.46.46,0,0,1,356.5,231.33Z");
    			attr(path0, "fill", "#d1d3d4");
    			attr(rect0, "x", "66.93");
    			attr(rect0, "y", "44.49");
    			attr(rect0, "width", "272.15");
    			attr(rect0, "height", "166.33");
    			attr(rect0, "rx", "5.37");
    			attr(rect0, "fill", "#fff");
    			attr(path1, "d", "M333.7,211.32H72.3a5.88,5.88,0,0,1-5.87-5.88V49.86A5.87,5.87,0,0,1,72.3,44H333.7a5.87,5.87,0,0,1,5.87,5.87V205.44A5.88,5.88,0,0,1,333.7,211.32ZM72.3,45a4.87,4.87,0,0,0-4.87,4.87V205.44a4.88,4.88,0,0,0,4.87,4.88H333.7a4.88,4.88,0,0,0,4.87-4.88V49.86A4.87,4.87,0,0,0,333.7,45Z");
    			attr(path1, "fill", "#231f20");
    			attr(path2, "d", "M187.75,163.67H82.63a.46.46,0,0,1-.46-.46.47.47,0,0,1,.46-.46H187.75a.47.47,0,0,1,.46.46A.46.46,0,0,1,187.75,163.67Z");
    			attr(path2, "fill", "#d1d3d4");
    			attr(path3, "d", "M139.32,202.34a.46.46,0,0,1-.46-.46V163a.46.46,0,0,1,.46-.46.47.47,0,0,1,.46.46v38.86A.47.47,0,0,1,139.32,202.34Z");
    			attr(path3, "fill", "#d1d3d4");
    			attr(path4, "d", "M320.64,137.77H199.76a.46.46,0,0,1-.46-.46.45.45,0,0,1,.46-.46H320.64a.45.45,0,0,1,.46.46A.46.46,0,0,1,320.64,137.77Z");
    			attr(path4, "fill", "#d1d3d4");
    			attr(path5, "d", "M320.64,149.59H199.76a.45.45,0,0,1-.46-.46.46.46,0,0,1,.46-.46H320.64a.46.46,0,0,1,.46.46A.45.45,0,0,1,320.64,149.59Z");
    			attr(path5, "fill", "#d1d3d4");
    			attr(path6, "d", "M320.64,161.42H199.76a.46.46,0,0,1,0-.92H320.64a.46.46,0,1,1,0,.92Z");
    			attr(path6, "fill", "#d1d3d4");
    			attr(path7, "d", "M320.64,173.25H199.76a.47.47,0,0,1,0-.93H320.64a.47.47,0,0,1,0,.93Z");
    			attr(path7, "fill", "#d1d3d4");
    			attr(path8, "d", "M320.64,185.07H199.76a.46.46,0,0,1,0-.92H320.64a.46.46,0,1,1,0,.92Z");
    			attr(path8, "fill", "#d1d3d4");
    			attr(path9, "d", "M326.84,121.81H187.18a.46.46,0,0,1-.46-.46.47.47,0,0,1,.46-.46H326.84a.47.47,0,0,1,.46.46A.46.46,0,0,1,326.84,121.81Z");
    			attr(path9, "fill", "#d1d3d4");
    			attr(rect1, "x", "199.38");
    			attr(rect1, "y", "77.99");
    			attr(rect1, "width", "48.05");
    			attr(rect1, "height", "32.66");
    			attr(rect1, "rx", "2.08");
    			attr(rect1, "fill", "#ed564e");
    			attr(path10, "d", "M187.56,201.4a.45.45,0,0,1-.46-.46V68.56a.46.46,0,0,1,.46-.46.47.47,0,0,1,.46.46V200.94A.46.46,0,0,1,187.56,201.4Z");
    			attr(path10, "fill", "#d1d3d4");
    			attr(path11, "d", "M327.77,68.69h-250a.46.46,0,0,1-.46-.46.47.47,0,0,1,.46-.46h250a.47.47,0,0,1,.47.46A.46.46,0,0,1,327.77,68.69Z");
    			attr(path11, "fill", "#d1d3d4");
    			attr(path12, "d", "M322.62,202.68H83.38a5.88,5.88,0,0,1-5.88-5.87V58.5a5.89,5.89,0,0,1,5.88-5.88H322.62a5.89,5.89,0,0,1,5.88,5.88V196.81A5.88,5.88,0,0,1,322.62,202.68ZM83.38,53.62A4.89,4.89,0,0,0,78.5,58.5V196.81a4.88,4.88,0,0,0,4.88,4.87H322.62a4.88,4.88,0,0,0,4.88-4.87V58.5a4.89,4.89,0,0,0-4.88-4.88Z");
    			attr(path12, "fill", "#231f20");
    			attr(path13, "d", "M230.7,210.87,202,210.8l-28.69.07s-2.53,26-19,37.13h95.41C233.23,236.9,230.7,210.87,230.7,210.87Z");
    			attr(path13, "fill", "#fff");
    			attr(path14, "d", "M249.71,248.5H154.29a.49.49,0,0,1-.47-.35.48.48,0,0,1,.2-.56c16.09-10.84,18.76-36.51,18.79-36.77a.5.5,0,0,1,.5-.45L202,210.3l28.7.07a.51.51,0,0,1,.5.45c0,.26,2.7,25.93,18.79,36.77a.51.51,0,0,1,.2.56A.5.5,0,0,1,249.71,248.5Zm-93.85-1h92.29c-14.2-10.69-17.47-32.71-17.89-36.13L202,211.3l-28.25.07C173.32,214.79,170.06,236.81,155.86,247.5Z");
    			attr(path14, "fill", "#231f20");
    			attr(rect2, "x", "142.21");
    			attr(rect2, "y", "248");
    			attr(rect2, "width", "119.59");
    			attr(rect2, "height", "9.9");
    			attr(rect2, "rx", "4.86");
    			attr(rect2, "fill", "#fff");
    			attr(path15, "d", "M256.94,258.41H147.07a5.37,5.37,0,0,1-5.36-5.36v-.19a5.37,5.37,0,0,1,5.36-5.36H256.94a5.37,5.37,0,0,1,5.36,5.36v.19A5.37,5.37,0,0,1,256.94,258.41ZM147.07,248.5a4.37,4.37,0,0,0-4.36,4.36v.19a4.37,4.37,0,0,0,4.36,4.36H256.94a4.37,4.37,0,0,0,4.36-4.36v-.19a4.37,4.37,0,0,0-4.36-4.36Z");
    			attr(path15, "fill", "#231f20");
    			attr(circle0, "cx", "93.67");
    			attr(circle0, "cy", "61.38");
    			attr(circle0, "r", "3.13");
    			attr(circle0, "fill", "#ed564e");
    			attr(circle1, "cx", "105.9");
    			attr(circle1, "cy", "61.38");
    			attr(circle1, "r", "3.13");
    			attr(circle1, "fill", "#231f20");
    			attr(circle2, "cx", "118.14");
    			attr(circle2, "cy", "61.38");
    			attr(circle2, "r", "3.13");
    			attr(circle2, "fill", "#231f20");
    			attr(path16, "d", "M99.39,224.43l8.16,29.95s14.32,3.33,14,4.25S99,262.56,99,262.56L89.55,228");
    			attr(path16, "fill", "#fff");
    			attr(path17, "d", "M99,263.06a.5.5,0,0,1-.48-.37l-9.45-34.6a.49.49,0,0,1,.35-.61.5.5,0,0,1,.61.35L99.37,262c7.34-1,18.47-2.67,21.25-3.47a115,115,0,0,0-13.18-3.66.5.5,0,0,1-.37-.35l-8.16-30a.5.5,0,0,1,1-.26L108,254c5.12,1.2,13.44,3.28,14,4.33a.79.79,0,0,1,.05.5c-.12.36-.41,1.22-23,4.26Zm22.14-4.24h0Zm.06-.52Z");
    			attr(path17, "fill", "#231f20");
    			attr(path18, "d", "M74,214.46l-2.35,45.4s22.37,4.85,22.45,4.27-12-9.21-12-9.21l3.51-32.26");
    			attr(path18, "fill", "#fff");
    			attr(path19, "d", "M93.9,264.64c-1.1,0-5.24-.57-22.4-4.29a.51.51,0,0,1-.4-.52l2.35-45.39a.5.5,0,1,1,1,.05l-2.33,45c6.92,1.5,17.27,3.64,20.7,4.12-2-1.71-7.51-5.69-11.11-8.25a.5.5,0,0,1-.2-.46L85,222.61a.5.5,0,0,1,.55-.45.51.51,0,0,1,.45.56l-3.48,32c12.15,8.64,12.07,9.15,12,9.52a.57.57,0,0,1-.22.35S94.21,264.64,93.9,264.64Z");
    			attr(path19, "fill", "#231f20");
    			attr(path20, "d", "M112.28,254.11l-3,4.6L97.48,260.1l1.16,4.52s26-3.25,26.55-5.62S112.28,254.11,112.28,254.11Z");
    			attr(path20, "fill", "#231f20");
    			attr(path21, "d", "M69.52,260.9l.68-4.64L83.86,260l2.66-3.51s10,7.26,8.64,8.82S79,264.05,69.52,260.9Z");
    			attr(path21, "fill", "#231f20");
    			attr(path22, "d", "M64.94,103.61a5.66,5.66,0,0,1,4,.3A12.36,12.36,0,0,1,78,96.6a26.74,26.74,0,0,1,4.2-.35c2.1,0,4.36.13,6,1.42a6.77,6.77,0,0,1,2,6.87c-1.22,5-5,6.23-8.43,9.06a15.62,15.62,0,0,0-5.31,11.7c0,9.86,3.12,20.76-7.69,26.68-6.89,3.76-16.23.85-20.85-5.5a13.53,13.53,0,0,1-2.26-4.6c-1.13-4.49.83-9.19,3.29-13.11s5-7.47,7.06-11.49c1.78-3.5,2-7.72,4.58-10.86A8.45,8.45,0,0,1,64.94,103.61Z");
    			attr(path22, "fill", "#fff");
    			attr(path23, "d", "M62.05,154.15a18.17,18.17,0,0,1-14.45-7.38A14.07,14.07,0,0,1,45.26,142c-1-3.91.11-8.33,3.35-13.5.71-1.13,1.44-2.24,2.16-3.35a87.83,87.83,0,0,0,4.88-8.1,28.61,28.61,0,0,0,1.62-4.34,18.94,18.94,0,0,1,3-6.61,9,9,0,0,1,4.52-3h0a6.28,6.28,0,0,1,3.94.13A12.75,12.75,0,0,1,78,96.11a27.73,27.73,0,0,1,4.28-.36c2.12,0,4.52.12,6.34,1.52a7.24,7.24,0,0,1,2.21,7.39c-1,4-3.44,5.67-6,7.46-.84.58-1.71,1.18-2.55,1.86a15.09,15.09,0,0,0-5.13,11.31c0,1.79.11,3.65.21,5.45.47,8.2,1,16.69-8.16,21.67A14.61,14.61,0,0,1,62.05,154.15Zm3-50.06a8,8,0,0,0-4,2.64A18,18,0,0,0,58.22,113a28.37,28.37,0,0,1-1.68,4.5,88,88,0,0,1-4.93,8.19c-.72,1.11-1.45,2.22-2.15,3.34-3.09,4.93-4.14,9.09-3.23,12.73a13.07,13.07,0,0,0,2.18,4.42c4.71,6.48,13.78,8.88,20.21,5.36,8.56-4.69,8.12-12.49,7.64-20.75-.1-1.81-.21-3.68-.21-5.49a16.09,16.09,0,0,1,5.5-12.09c.87-.71,1.75-1.32,2.61-1.91,2.56-1.76,4.77-3.28,5.64-6.87.51-2.07.13-4.84-1.84-6.37-1.57-1.21-3.78-1.34-5.71-1.31a24.47,24.47,0,0,0-4.12.35,11.81,11.81,0,0,0-8.68,7,.53.53,0,0,1-.29.26.58.58,0,0,1-.39,0,5.18,5.18,0,0,0-3.7-.27Z");
    			attr(path23, "fill", "#231f20");
    			attr(path24, "d", "M97.62,136.42c-2.22.85-5.87,1.64-6.82-1.44a4.75,4.75,0,0,1-.14-1.68,17.16,17.16,0,0,1,.45-2.46,42.11,42.11,0,0,1,2.34-6.6c.23-.54.69-1.19,1.25-1s.54.78.53,1.28c0,1.39-.23,2.8-.2,4.19,2.94-.75,4.79-3.86,7.59-4.53.79-.18,1.75-.24,1.84.78.1,1.26-2.18,2.25-2.94,2.9a9.2,9.2,0,0,1,2.89-1.68,1.9,1.9,0,0,1,.94-.15.75.75,0,0,1,.64.64,1,1,0,0,1-.34.69,10.16,10.16,0,0,1-1.44,1.34,3.62,3.62,0,0,1,2-1.21,1,1,0,0,1,1.11.31c.33.53-.3,1.13-.84,1.44a3.18,3.18,0,0,1,1.52-.76,1.12,1.12,0,0,1,1.28.86,1.55,1.55,0,0,1-.6,1.15C105.82,133.34,101.34,135,97.62,136.42Z");
    			attr(path24, "fill", "#fff");
    			attr(path25, "d", "M94.07,137.68a4.53,4.53,0,0,1-2-.4,3.37,3.37,0,0,1-1.76-2.15,5,5,0,0,1-.17-1.87,17.51,17.51,0,0,1,.46-2.54A42.31,42.31,0,0,1,93,124c.44-1,1.15-1.52,1.87-1.27.41.14.9.56.87,1.76,0,.6,0,1.2-.1,1.8s-.08,1.13-.1,1.69a12,12,0,0,0,3-2,10.36,10.36,0,0,1,3.92-2.31,2.38,2.38,0,0,1,1.91.15,1.39,1.39,0,0,1,.54,1.07,1.62,1.62,0,0,1-.07.62,1.75,1.75,0,0,1,.56,0,1.25,1.25,0,0,1,1,1.1,1.58,1.58,0,0,1,0,.32,1.36,1.36,0,0,1,1.33.58,1.07,1.07,0,0,1,.16.44h0a1.83,1.83,0,0,1,1.32.39,1.37,1.37,0,0,1,.51.93,2,2,0,0,1-.75,1.54c-2.84,2.8-7.06,4.42-10.77,5.85l-.5.2h0A11.23,11.23,0,0,1,94.07,137.68Zm.43-14c-.16,0-.41.31-.59.72A41.75,41.75,0,0,0,91.59,131a16.18,16.18,0,0,0-.43,2.39,4.37,4.37,0,0,0,.12,1.5,2.41,2.41,0,0,0,1.24,1.54c1.47.71,3.71,0,4.92-.43l.5-.19c3.62-1.4,7.73-3,10.43-5.63.2-.2.47-.5.45-.74a.38.38,0,0,0-.14-.25.86.86,0,0,0-.58-.17,1.94,1.94,0,0,0-.82.34,3.09,3.09,0,0,1-.51.36.51.51,0,0,1-.67-.16.5.5,0,0,1,.12-.67l.45-.33a.86.86,0,0,0,.28-.37c-.06-.17-.3-.22-.61-.16a3.16,3.16,0,0,0-.94.36,10.8,10.8,0,0,1-.89.76.5.5,0,0,1-.69-.72,4.31,4.31,0,0,1,1-.84c.17-.16.33-.33.49-.51s.21-.28.21-.34-.1-.14-.23-.16a1.46,1.46,0,0,0-.68.12,8.79,8.79,0,0,0-1.08.47c-.29.21-.59.4-.87.58a7.68,7.68,0,0,0-.78.54h0a.5.5,0,1,1-.66-.75h0a9.87,9.87,0,0,1,1.75-1.2c.56-.41,1-.87,1-1.28,0-.25-.11-.32-.14-.34s-.37-.16-1.08,0a9.54,9.54,0,0,0-3.53,2.12,10.87,10.87,0,0,1-4,2.4.5.5,0,0,1-.43-.08.53.53,0,0,1-.2-.39c0-.83,0-1.66.1-2.47.05-.58.09-1.16.1-1.74s-.09-.76-.2-.79Zm3.12,12.71h0Z");
    			attr(path25, "fill", "#231f20");
    			attr(path26, "d", "M95.17,128.84a4.63,4.63,0,0,1,.09,5.79l.29,0");
    			attr(path26, "fill", "#fff");
    			attr(path27, "d", "M95.26,135.13a.51.51,0,0,1-.45-.28.51.51,0,0,1,.06-.54,4.12,4.12,0,0,0-.08-5.14.5.5,0,0,1,.76-.65,5.11,5.11,0,0,1,.46,5.91.83.83,0,0,1,0,.15.5.5,0,0,1-.47.53l-.29,0Z");
    			attr(path27, "fill", "#231f20");
    			attr(rect3, "x", "95.77");
    			attr(rect3, "y", "96.18");
    			attr(rect3, "width", "73.19");
    			attr(rect3, "height", "34.73");
    			attr(rect3, "rx", "3.34");
    			attr(rect3, "fill", "#fff");
    			attr(path28, "d", "M165.62,131.41H99.11a3.84,3.84,0,0,1-3.84-3.84v-28a3.84,3.84,0,0,1,3.84-3.84h66.51a3.84,3.84,0,0,1,3.84,3.84v28.05A3.84,3.84,0,0,1,165.62,131.41ZM99.11,96.68a2.84,2.84,0,0,0-2.84,2.84v28.05a2.84,2.84,0,0,0,2.84,2.84h66.51a2.84,2.84,0,0,0,2.84-2.84v-28a2.84,2.84,0,0,0-2.84-2.84Z");
    			attr(path28, "fill", "#231f20");
    			attr(circle3, "cx", "112.64");
    			attr(circle3, "cy", "113.55");
    			attr(circle3, "r", "9.29");
    			attr(circle3, "fill", "#231f20");
    			attr(path29, "d", "M160.94,109.12H131.43a.5.5,0,0,1,0-1h29.51a.5.5,0,0,1,0,1Z");
    			attr(path29, "fill", "#231f20");
    			attr(path30, "d", "M160.94,114.05H131.43a.5.5,0,0,1-.5-.5.5.5,0,0,1,.5-.5h29.51a.5.5,0,0,1,.5.5A.5.5,0,0,1,160.94,114.05Z");
    			attr(path30, "fill", "#231f20");
    			attr(path31, "d", "M150.69,119H131.43a.5.5,0,0,1-.5-.5.5.5,0,0,1,.5-.5h19.26a.5.5,0,0,1,.5.5A.5.5,0,0,1,150.69,119Z");
    			attr(path31, "fill", "#231f20");
    			attr(path32, "d", "M97,136.06s11.88,7.92,16.5,5.54,14.13-10.82,14.13-10.82,2.25-5.55,4.23-5.16.13,5.68.13,5.68,11.75-2,11.62-.79-6.34,4.09-9.11,4.62S121.72,151.51,115,153.36s-13.47-2.25-20.74-6.74");
    			attr(path32, "fill", "#fff");
    			attr(path33, "d", "M111.54,154.32c-5.79,0-11.53-3.55-17.55-7.27a.49.49,0,0,1-.16-.69.48.48,0,0,1,.68-.16c7.07,4.36,13.74,8.49,20.34,6.68,3.88-1.07,9-7.09,13.13-11.92,3.3-3.88,5.23-6.08,6.46-6.32,2.72-.52,7.63-2.93,8.56-4-1.33-.22-6.36.36-10.9,1.13a.5.5,0,0,1-.46-.17.49.49,0,0,1-.09-.49c.48-1.39,1.06-3.91.56-4.78a.41.41,0,0,0-.32-.24c-1.07-.22-2.82,2.76-3.66,4.84a.64.64,0,0,1-.13.19c-.4.35-9.61,8.52-14.24,10.9-4.82,2.48-16.52-5.25-17-5.58a.5.5,0,0,1,.55-.83c3.24,2.16,12.43,7.36,16,5.52,4.29-2.2,13-9.83,13.94-10.68.5-1.2,2.55-5.78,4.75-5.35a1.43,1.43,0,0,1,1,.74c.67,1.17.13,3.55-.24,4.81,4.13-.68,10.3-1.52,11.19-.68a.72.72,0,0,1,.21.57c-.19,1.66-7.09,4.59-9.52,5.05-.94.18-3.45,3.13-5.88,6-4.21,4.93-9.44,11.08-13.62,12.23A13.41,13.41,0,0,1,111.54,154.32Z");
    			attr(path33, "fill", "#231f20");
    			attr(path34, "d", "M92.48,163.84c1,6.91,1.21,9.63,11.06,66.18,0,0-23,5.41-31.88,7-6-12.37-8.71-23.5-12.8-36.59-2.65-8.49-4.66-19.86-.85-27.89.61-1.28,6.49-13.75,6.49-13.75S92.52,164.09,92.48,163.84Z");
    			attr(path34, "fill", "#231f20");
    			attr(path35, "d", "M72.4,132.42c.35-7.55-1.17-22.86-1.17-22.86s9.62.55,12.85-4.07c4,3.1,4.78,11.84,4,14.46-1.43,5.16-8.13,4-8.13,4l.85,9.44Z");
    			attr(path35, "fill", "#fff");
    			attr(path36, "d", "M80.85,133.91h0l-8.46-1a.5.5,0,0,1-.44-.52c.35-7.42-1.15-22.63-1.17-22.78a.53.53,0,0,1,.14-.4.52.52,0,0,1,.39-.15c.09,0,9.38.48,12.41-3.86a.5.5,0,0,1,.72-.11c4.15,3.25,5,12.22,4.23,15-1.27,4.54-6.28,4.59-8.07,4.45l.8,8.84a.46.46,0,0,1-.15.4A.5.5,0,0,1,80.85,133.91ZM72.92,132l7.38.87L79.5,124a.48.48,0,0,1,.16-.42.49.49,0,0,1,.42-.12c.26,0,6.28,1,7.57-3.67.62-2.22,0-10.32-3.49-13.6-3.13,3.75-10.27,3.9-12.38,3.87C72.05,112.86,73.16,125.19,72.92,132Z");
    			attr(path36, "fill", "#231f20");
    			attr(path37, "d", "M80,124a8.36,8.36,0,0,1-4.15-1.72s1.83,4.58,4.65,5.26Z");
    			attr(path37, "fill", "#231f20");
    			attr(path38, "d", "M80.5,128h-.11c-3-.74-4.88-5.34-5-5.54a.46.46,0,0,1,.17-.55.47.47,0,0,1,.58.06c1.24,1.25,3.85,1.58,3.87,1.59a.45.45,0,0,1,.4.39l.5,3.54a.43.43,0,0,1-.14.4A.47.47,0,0,1,80.5,128ZM77,123.58a8.19,8.19,0,0,0,2.92,3.24l-.35-2.45A10.36,10.36,0,0,1,77,123.58Z");
    			attr(path38, "fill", "#231f20");
    			attr(path39, "d", "M87.25,128.53l22,12-5.31,15.37s-27.61-14.61-27.8-18.57S87.25,128.53,87.25,128.53Z");
    			attr(path39, "fill", "#ed564e");
    			attr(path40, "d", "M92.82,166.55a73.41,73.41,0,0,0,.33-23.45c-.84-5.08-.51-8.65-2.2-11.4-5.65-9.23-27.67-6.48-30.87-.07s2.77,29.81,2.77,29.81Z");
    			attr(path40, "fill", "#ed564e");
    			attr(path41, "d", "M72.8,114.93a3.32,3.32,0,0,0-2.34-2.52,2,2,0,0,0-1.59.18,2.14,2.14,0,0,0-.72,2,4.53,4.53,0,0,0,1.45,3,4.48,4.48,0,0,0,3.1,1.18");
    			attr(path41, "fill", "#fff");
    			attr(path42, "d", "M72.64,119.21a5,5,0,0,1-3.38-1.31,5.07,5.07,0,0,1-1.61-3.32,2.58,2.58,0,0,1,.94-2.4,2.42,2.42,0,0,1,2-.25,3.82,3.82,0,0,1,2.7,2.9.51.51,0,0,1-.4.59.5.5,0,0,1-.58-.4,2.83,2.83,0,0,0-2-2.12,1.42,1.42,0,0,0-1.17.1,1.73,1.73,0,0,0-.51,1.5,4,4,0,0,0,1.28,2.66,3.94,3.94,0,0,0,2.76,1h0a.51.51,0,0,1,.5.5.5.5,0,0,1-.5.5Z");
    			attr(path42, "fill", "#231f20");
    			attr(ellipse0, "cx", "84.39");
    			attr(ellipse0, "cy", "110.41");
    			attr(ellipse0, "rx", "0.46");
    			attr(ellipse0, "ry", "0.86");
    			attr(ellipse0, "transform", "translate(-29.06 30.15) rotate(-17.33)");
    			attr(ellipse0, "fill", "#231f20");
    			attr(path43, "d", "M86.43,120.32a6.74,6.74,0,0,1-1.94.85,2.67,2.67,0,0,1-2.68-.47,3.11,3.11,0,0,1-.57-1.08");
    			attr(path43, "fill", "#fff");
    			attr(path44, "d", "M83.43,121.82a2.58,2.58,0,0,1-2-.78,3.55,3.55,0,0,1-.67-1.25.49.49,0,0,1,.29-.64.5.5,0,0,1,.65.29,2.72,2.72,0,0,0,.47.93c.61.67,1.83.42,2.19.32a6.52,6.52,0,0,0,1.79-.79.5.5,0,0,1,.69.15.49.49,0,0,1-.15.69,7.46,7.46,0,0,1-2.08.92A4.71,4.71,0,0,1,83.43,121.82Z");
    			attr(path44, "fill", "#231f20");
    			attr(path45, "d", "M86.49,111.29s3.86,4.4,2.91,5.35-3.18.48-3.18.48");
    			attr(path45, "fill", "#fff");
    			attr(path46, "d", "M87.45,117.74a7.53,7.53,0,0,1-1.34-.13.5.5,0,0,1-.38-.6.49.49,0,0,1,.59-.38c.55.11,2.11.28,2.73-.34.21-.44-1.19-2.67-2.94-4.67a.51.51,0,0,1,0-.71.49.49,0,0,1,.7,0c1.56,1.77,4,4.92,2.9,6A3.31,3.31,0,0,1,87.45,117.74Z");
    			attr(path46, "fill", "#231f20");
    			attr(path47, "d", "M103.9,156.44a.53.53,0,0,1-.24-.06c-.15-.08-15.33-8.19-20.87-11.2a.49.49,0,0,1-.2-.67.5.5,0,0,1,.68-.21c5.53,3,20.71,11.11,20.86,11.2a.49.49,0,0,1,.21.67A.5.5,0,0,1,103.9,156.44Z");
    			attr(path47, "fill", "#231f20");
    			attr(path48, "d", "M293,163.33l1.85-.05a4.1,4.1,0,0,1,3.86,2.31l36.09,99.71c.48,1.32-.48,2.43-2.14,2.48l-1.84.05a4.14,4.14,0,0,1-3.87-2.31L290.89,165.8C290.42,164.48,291.37,163.37,293,163.33Z");
    			attr(path48, "fill", "#fff");
    			attr(path49, "d", "M330.74,268.33a4.58,4.58,0,0,1-4.23-2.64L290.42,166a2.18,2.18,0,0,1,.21-2,2.91,2.91,0,0,1,2.39-1.13l1.84-.05a4.65,4.65,0,0,1,4.35,2.63l36.09,99.72a2.17,2.17,0,0,1-.21,2,2.9,2.9,0,0,1-2.38,1.13l-1.85.05Zm-37.69-104.5a1.93,1.93,0,0,0-1.59.69,1.19,1.19,0,0,0-.1,1.11l36.09,99.72a3.68,3.68,0,0,0,3.38,2l1.85-.05a2,2,0,0,0,1.59-.7,1.19,1.19,0,0,0,.09-1.11l-36.09-99.72a3.62,3.62,0,0,0-3.38-2l-1.84.05Zm0-.5h0Z");
    			attr(path49, "fill", "#d1d3d4");
    			attr(path50, "d", "M295,171.16l-33.52.57a3.15,3.15,0,0,1-2.93-1.75h0c-.36-1,.37-1.84,1.62-1.87l33.52-.57a3.13,3.13,0,0,1,2.93,1.75h0C297,170.29,296.28,171.13,295,171.16Z");
    			attr(path50, "fill", "#fff");
    			attr(path51, "d", "M261.42,172.23a3.61,3.61,0,0,1-3.32-2.08,1.76,1.76,0,0,1,.18-1.64,2.3,2.3,0,0,1,1.9-.9L293.7,167a3.57,3.57,0,0,1,3.41,2.08,1.76,1.76,0,0,1-.17,1.63,2.29,2.29,0,0,1-1.9.91h0l-33.52.57ZM293.79,168h-.06l-33.53.57a1.33,1.33,0,0,0-1.1.47.8.8,0,0,0-.06.73,2.62,2.62,0,0,0,2.45,1.42l33.52-.57a1.33,1.33,0,0,0,1.1-.47.77.77,0,0,0,.06-.73A2.63,2.63,0,0,0,293.79,168Zm1.23,3.12h0Z");
    			attr(path51, "fill", "#d1d3d4");
    			attr(path52, "d", "M300.06,185.07l-33.52.57a3.13,3.13,0,0,1-2.93-1.75h0c-.36-1,.36-1.84,1.62-1.87l33.52-.57a3.15,3.15,0,0,1,2.93,1.75h0C302,184.2,301.31,185,300.06,185.07Z");
    			attr(path52, "fill", "#fff");
    			attr(path53, "d", "M266.45,186.14a3.6,3.6,0,0,1-3.31-2.08,1.76,1.76,0,0,1,.17-1.63,2.3,2.3,0,0,1,1.91-.91l33.52-.57a3.63,3.63,0,0,1,3.41,2.08,1.79,1.79,0,0,1-.17,1.64,2.33,2.33,0,0,1-1.91.9h0l-33.52.57ZM298.83,182h-.07l-33.52.57a1.32,1.32,0,0,0-1.1.47.77.77,0,0,0-.06.73,2.61,2.61,0,0,0,2.45,1.42l33.52-.57a1.32,1.32,0,0,0,1.1-.47.8.8,0,0,0,.06-.73A2.65,2.65,0,0,0,298.83,182Zm1.23,3.12h0Z");
    			attr(path53, "fill", "#d1d3d4");
    			attr(path54, "d", "M305.09,199l-33.52.56a3.13,3.13,0,0,1-2.93-1.74h0c-.36-1,.37-1.84,1.62-1.88l33.52-.56a3.11,3.11,0,0,1,2.93,1.75h0C307.07,198.12,306.35,199,305.09,199Z");
    			attr(path54, "fill", "#fff");
    			attr(path55, "d", "M271.49,200.06a3.61,3.61,0,0,1-3.32-2.08,1.75,1.75,0,0,1,.18-1.64,2.33,2.33,0,0,1,1.9-.91l33.52-.56a3.58,3.58,0,0,1,3.41,2.08,1.76,1.76,0,0,1-.17,1.63,2.32,2.32,0,0,1-1.9.91h0l-33.52.56Zm32.37-4.19h-.06l-33.53.56a1.39,1.39,0,0,0-1.1.47.79.79,0,0,0-.05.74,2.58,2.58,0,0,0,2.44,1.41l33.52-.56a1.36,1.36,0,0,0,1.1-.47.77.77,0,0,0,.06-.73A2.63,2.63,0,0,0,303.86,195.87Zm1.23,3.12h0Z");
    			attr(path55, "fill", "#d1d3d4");
    			attr(path56, "d", "M310.13,212.9l-33.52.57a3.13,3.13,0,0,1-2.93-1.75h0c-.36-1,.36-1.84,1.62-1.87l33.52-.57a3.14,3.14,0,0,1,2.93,1.75h0C312.11,212,311.38,212.87,310.13,212.9Z");
    			attr(path56, "fill", "#fff");
    			attr(path57, "d", "M276.52,214a3.6,3.6,0,0,1-3.31-2.08,1.79,1.79,0,0,1,.17-1.64,2.32,2.32,0,0,1,1.91-.9l33.52-.57a3.59,3.59,0,0,1,3.41,2.08,1.76,1.76,0,0,1-.17,1.63,2.31,2.31,0,0,1-1.91.91h0l-33.52.57Zm32.38-4.19h-.07l-33.52.57a1.32,1.32,0,0,0-1.1.47.77.77,0,0,0-.06.73A2.62,2.62,0,0,0,276.6,213l33.52-.57a1.32,1.32,0,0,0,1.1-.47.8.8,0,0,0,.06-.73A2.64,2.64,0,0,0,308.9,209.78Zm1.23,3.12h0Z");
    			attr(path57, "fill", "#d1d3d4");
    			attr(path58, "d", "M315.16,226.82l-33.52.56a3.11,3.11,0,0,1-2.92-1.75h0c-.37-1,.36-1.83,1.61-1.87l33.52-.56a3.11,3.11,0,0,1,2.93,1.74h0C317.14,225.94,316.42,226.78,315.16,226.82Z");
    			attr(path58, "fill", "#fff");
    			attr(path59, "d", "M281.56,227.88a3.59,3.59,0,0,1-3.31-2.08,1.71,1.71,0,0,1,.17-1.63,2.3,2.3,0,0,1,1.9-.91l33.52-.56a3.58,3.58,0,0,1,3.41,2.07,1.78,1.78,0,0,1-.17,1.64,2.35,2.35,0,0,1-1.9.91h0l-33.52.56Zm32.37-4.19h-.06l-33.53.56a1.39,1.39,0,0,0-1.1.47.8.8,0,0,0-.05.73,2.6,2.6,0,0,0,2.44,1.42l33.52-.56a1.36,1.36,0,0,0,1.1-.47.79.79,0,0,0,.06-.74A2.63,2.63,0,0,0,313.93,223.69Zm1.23,3.13h0Z");
    			attr(path59, "fill", "#d1d3d4");
    			attr(path60, "d", "M320.2,240.73l-33.52.57a3.13,3.13,0,0,1-2.93-1.75h0c-.36-1,.36-1.84,1.62-1.87l33.52-.57a3.14,3.14,0,0,1,2.93,1.75h0C322.18,239.86,321.45,240.7,320.2,240.73Z");
    			attr(path60, "fill", "#fff");
    			attr(path61, "d", "M286.59,241.8a3.6,3.6,0,0,1-3.31-2.08,1.78,1.78,0,0,1,.17-1.64,2.32,2.32,0,0,1,1.91-.9l33.52-.57a3.61,3.61,0,0,1,3.41,2.08,1.76,1.76,0,0,1-.17,1.63,2.31,2.31,0,0,1-1.91.91h0l-33.52.57ZM319,237.61h-.07l-33.52.57a1.32,1.32,0,0,0-1.1.47.77.77,0,0,0-.06.73,2.61,2.61,0,0,0,2.45,1.42l33.52-.57a1.34,1.34,0,0,0,1.1-.47.8.8,0,0,0,.06-.73A2.64,2.64,0,0,0,319,237.61Zm1.23,3.12h0Z");
    			attr(path61, "fill", "#d1d3d4");
    			attr(path62, "d", "M325.23,254.64l-33.51.57a3.13,3.13,0,0,1-2.93-1.75h0c-.37-1,.36-1.84,1.61-1.87l33.52-.57a3.13,3.13,0,0,1,2.93,1.75h0C327.21,253.77,326.49,254.61,325.23,254.64Z");
    			attr(path62, "fill", "#fff");
    			attr(path63, "d", "M291.63,255.71a3.59,3.59,0,0,1-3.31-2.08,1.73,1.73,0,0,1,.17-1.63,2.28,2.28,0,0,1,1.9-.91l33.52-.57a3.6,3.6,0,0,1,3.41,2.08,1.78,1.78,0,0,1-.17,1.64,2.31,2.31,0,0,1-1.9.9h0l-33.52.57ZM324,251.52h-.06l-33.53.57a1.33,1.33,0,0,0-1.1.47.8.8,0,0,0-.05.73,2.59,2.59,0,0,0,2.44,1.42l33.52-.57a1.3,1.3,0,0,0,1.1-.47.77.77,0,0,0,.06-.73A2.63,2.63,0,0,0,324,251.52Zm1.23,3.12h0Z");
    			attr(path63, "fill", "#d1d3d4");
    			attr(path64, "d", "M256.91,164l1.84-.06a4.14,4.14,0,0,1,3.87,2.31l36.09,99.72c.47,1.32-.48,2.43-2.14,2.47l-1.85,0a4.1,4.1,0,0,1-3.86-2.3l-36.09-99.72C254.29,165.12,255.25,164,256.91,164Z");
    			attr(path64, "fill", "#fff");
    			attr(path65, "d", "M294.62,269a4.58,4.58,0,0,1-4.23-2.63L254.3,166.61a2.17,2.17,0,0,1,.21-2,2.89,2.89,0,0,1,2.38-1.12h0l1.85-.05a4.57,4.57,0,0,1,4.35,2.63l36.09,99.72a2.18,2.18,0,0,1-.21,2,2.91,2.91,0,0,1-2.39,1.13l-1.84,0Zm-37.7-104.49a1.91,1.91,0,0,0-1.58.69,1.16,1.16,0,0,0-.1,1.11L291.33,266a3.63,3.63,0,0,0,3.38,2l1.84,0a1.92,1.92,0,0,0,1.59-.69,1.19,1.19,0,0,0,.1-1.11l-36.09-99.72a3.61,3.61,0,0,0-3.38-2Z");
    			attr(path65, "fill", "#d1d3d4");
    			attr(path66, "d", "M282.11,105.37c-7.19,4.17-15.51,7.43-23.95,5.79C251,109.78,244.54,105,242,98.08c-.51-1.36-.83-2.79-1.37-4.15-.22-.54-.56-1.14-1.14-1.19-.94-.08-1.26,1.22-1.15,2.15.09.75.18,1.44.2,2.18,0,.51,0,1.84.45,2.22l-6.4-6.2a2.51,2.51,0,0,0-1.1-.73.86.86,0,0,0-1.06.55,1.24,1.24,0,0,0,.38,1l2.55,3.29a44.41,44.41,0,0,0-3.53-2.74c-1.64-1.13-2.15.53-1.18,1.78l2.59,3.33a23.44,23.44,0,0,0-2.76-2.42c-.29-.22-.68-.43-1-.23a.6.6,0,0,0-.17.66,1.66,1.66,0,0,0,.4.61l2.41,2.75c-.42-.42-2.5-2.38-3.06-1.31-.32.61.87,1.58,1.23,1.94,2.35,2.3,4.73,4.5,7.16,6.67,6.53,5.84,14,11.25,22.81,13.24,9.65,2.19,20.25-.3,28.38-5.87");
    			attr(path66, "fill", "#fff");
    			attr(path67, "d", "M265.43,122.72a33,33,0,0,1-7.31-.8c-9.74-2.21-17.81-8.68-23-13.35-2.69-2.41-5-4.6-7.16-6.69l-.17-.15c-.61-.57-1.62-1.51-1.16-2.38a1,1,0,0,1,.77-.57l.2,0-.26-.29a2.33,2.33,0,0,1-.5-.79,1.1,1.1,0,0,1,.37-1.22,1,1,0,0,1,.93-.11,2,2,0,0,1-.13-2.46c.18-.19.86-.74,2.09.11l.38.27-.08-.1a1.77,1.77,0,0,1-.47-1.35,1.16,1.16,0,0,1,.52-.75,1.47,1.47,0,0,1,1.14-.2,3,3,0,0,1,1.33.86l5.14,5,0-.61a17.41,17.41,0,0,0-.15-1.76l-.05-.38a3,3,0,0,1,.61-2.3,1.32,1.32,0,0,1,1.08-.41c.66.06,1.19.57,1.56,1.51.3.74.53,1.51.76,2.25s.39,1.28.62,1.91c2.41,6.44,8.48,11.33,15.84,12.76,6.91,1.35,14.63-.53,23.6-5.73a.5.5,0,1,1,.5.86c-9.19,5.33-17.13,7.24-24.29,5.85-7.7-1.49-14.06-6.63-16.59-13.39-.24-.65-.44-1.31-.64-2s-.45-1.47-.73-2.17c-.15-.39-.4-.85-.72-.88a.33.33,0,0,0-.28.11,2.07,2.07,0,0,0-.32,1.49l0,.37c.07.62.14,1.21.16,1.84,0,1.51.24,1.82.29,1.88a.48.48,0,0,1,0,.7.49.49,0,0,1-.7,0h0l-6.4-6.19a2.24,2.24,0,0,0-.86-.61.56.56,0,0,0-.38.07.16.16,0,0,0-.08.1c0,.14.18.41.28.54l2.56,3.3a.5.5,0,0,1-.72.68,41.87,41.87,0,0,0-3.5-2.71c-.41-.28-.7-.33-.79-.24s-.16.72.29,1.3l2.59,3.33a.5.5,0,0,1-.06.69.51.51,0,0,1-.69,0,23.25,23.25,0,0,0-2.7-2.37.9.9,0,0,0-.4-.21s0,0,0,.1a1.45,1.45,0,0,0,.29.42l2.42,2.75a.5.5,0,0,1,0,.69.51.51,0,0,1-.7,0c-1-1-1.92-1.52-2.22-1.47-.06.13,0,.42.91,1.22l.18.18c2.12,2.08,4.46,4.25,7.14,6.65,5.14,4.6,13.08,11,22.59,13.12,9.19,2.09,19.65-.08,28-5.79a.5.5,0,1,1,.57.82A38.43,38.43,0,0,1,265.43,122.72Z");
    			attr(path67, "fill", "#231f20");
    			attr(path68, "d", "M315.5,215.17l.9,6.59s-18.34,1.9-17.63.32a68.46,68.46,0,0,1,4.42-6.62");
    			attr(path68, "fill", "#fff");
    			attr(path69, "d", "M302.64,223.2c-2.27,0-3.93-.17-4.26-.64a.68.68,0,0,1-.07-.69,68.38,68.38,0,0,1,4.48-6.71.51.51,0,0,1,.7-.1.5.5,0,0,1,.1.7c0,.05-3.33,4.51-4.24,6.26,1.52.46,9.26,0,16.49-.7l-.84-6.09a.5.5,0,0,1,1-.13l.91,6.59a.51.51,0,0,1-.1.38.53.53,0,0,1-.35.19C312.42,222.68,306.59,223.2,302.64,223.2Z");
    			attr(path69, "fill", "#231f20");
    			attr(path70, "d", "M289.8,189.89s3.83,4.81,3.13,5.69-21,1.88-20.13-.23,6.31-6.6,6.31-6.6");
    			attr(path70, "fill", "#fff");
    			attr(path71, "d", "M280.79,197.11c-3.67,0-7-.23-8-.83a.87.87,0,0,1-.46-1.13c.91-2.2,6.22-6.6,6.45-6.79a.5.5,0,0,1,.7.07.5.5,0,0,1-.07.71c-1.45,1.19-5.31,4.61-6.11,6.29,1.56,1.14,17.35.59,19.21-.18,0-.63-1.38-2.87-3.11-5.05a.49.49,0,0,1,.07-.7.51.51,0,0,1,.71.08c1.86,2.34,3.91,5.33,3.13,6.31C292.78,196.57,286.36,197.11,280.79,197.11Z");
    			attr(path71, "fill", "#231f20");
    			attr(path72, "d", "M282.68,138.39s-22.91,14.22-22.62,21.91c.19,5.22,16.22,31.44,16.22,31.44l15.37-.85s-14-21.39-10.91-24.52S301,154.61,301,154.61l.31,61.49S317,215,317,214.11,320.39,141,320.39,141Z");
    			attr(path72, "fill", "#231f20");
    			attr(path73, "d", "M315.91,72.3a4.15,4.15,0,0,0-1.13-2.55,2,2,0,0,0-2.58-.15c.12-1.7-1.42-3-2.92-3.85a19.62,19.62,0,0,0-6-2.12,27,27,0,0,0-4.2-.35c-2.11,0-4.36.13-6,1.42a6.73,6.73,0,0,0-2,6.87,13.66,13.66,0,0,0,4,6.32,19,19,0,0,0,7.74,4.92,20.38,20.38,0,0,0,5.38.76c2.91.1,4.17-1.27,5.66-3.49A10.87,10.87,0,0,0,315.91,72.3Z");
    			attr(path73, "fill", "#fff");
    			attr(path74, "d", "M308.4,84.08h-.29a21.25,21.25,0,0,1-5.51-.78,19.56,19.56,0,0,1-8-5,14.12,14.12,0,0,1-4.14-6.56,7.24,7.24,0,0,1,2.2-7.39c1.82-1.4,4.23-1.56,6.35-1.52a26.31,26.31,0,0,1,4.27.36,19.93,19.93,0,0,1,6.19,2.17c1.08.59,2.77,1.77,3.12,3.47a2.66,2.66,0,0,1,2.48.6,4.64,4.64,0,0,1,1.29,2.85h0c.39,2.71-.32,5.29-2.22,8.12C312.78,82.46,311.45,84.08,308.4,84.08Zm-9.83-20.31a8.48,8.48,0,0,0-5.24,1.32c-2,1.53-2.35,4.3-1.85,6.36a13.25,13.25,0,0,0,3.87,6.09,18.49,18.49,0,0,0,7.54,4.79,19.7,19.7,0,0,0,5.25.74c2.52.09,3.66-.94,5.22-3.27a10.29,10.29,0,0,0,2.06-7.43h0a3.61,3.61,0,0,0-1-2.25,1.49,1.49,0,0,0-1.9-.16.47.47,0,0,1-.55.09.49.49,0,0,1-.29-.48c.11-1.61-1.62-2.81-2.66-3.38a18.83,18.83,0,0,0-5.88-2.07,25.65,25.65,0,0,0-4.12-.34Z");
    			attr(path74, "fill", "#231f20");
    			attr(path75, "d", "M308.88,99.45c-.35-7.55,1.18-22.86,1.18-22.86s-9.62.55-12.86-4.08c-4,3.11-4.77,11.85-4.05,14.46,1.44,5.17,8.14,4,8.14,4l-.86,9.44Z");
    			attr(path75, "fill", "#fff");
    			attr(path76, "d", "M300.43,100.94a.52.52,0,0,1-.35-.14.54.54,0,0,1-.15-.4l.81-8.84c-1.79.14-6.81.09-8.07-4.45-.77-2.77.08-11.74,4.22-15a.54.54,0,0,1,.39-.1.48.48,0,0,1,.33.21c3,4.34,12.32,3.86,12.42,3.86a.47.47,0,0,1,.39.15.49.49,0,0,1,.13.4c0,.15-1.51,15.36-1.17,22.78a.49.49,0,0,1-.44.52l-8.45,1Zm.86-10.44a.51.51,0,0,1,.34.13.53.53,0,0,1,.16.41l-.8,8.83,7.38-.87c-.24-6.78.87-19.11,1.13-21.89-2.09,0-9.24-.12-12.37-3.87-3.52,3.27-4.11,11.38-3.5,13.6,1.3,4.66,7.32,3.71,7.58,3.67Z");
    			attr(path76, "fill", "#231f20");
    			attr(path77, "d", "M301.29,91s2.77-.35,4.14-1.72c0,0-1.83,4.58-4.65,5.26Z");
    			attr(path77, "fill", "#231f20");
    			attr(path78, "d", "M300.78,95a.42.42,0,0,1-.3-.12.46.46,0,0,1-.15-.4l.51-3.55a.45.45,0,0,1,.39-.38s2.64-.35,3.88-1.59a.47.47,0,0,1,.58-.06.46.46,0,0,1,.17.55c-.08.2-1.95,4.8-5,5.53Zm.92-3.6-.36,2.45a8.21,8.21,0,0,0,2.93-3.24A10.81,10.81,0,0,1,301.7,91.4Z");
    			attr(path78, "fill", "#231f20");
    			attr(path79, "d", "M295.3,94.57l-21.95,12L278.66,122s27.61-14.61,27.79-18.56S295.3,94.57,295.3,94.57Z");
    			attr(path79, "fill", "#ed564e");
    			attr(path80, "d", "M282.11,138.81s1.05-15.71,3-27.68c.84-5.09.52-8.65,2.21-11.4,5.65-9.24,27.67-6.48,30.87-.07S320.39,141,320.39,141Z");
    			attr(path80, "fill", "#ed564e");
    			attr(path81, "d", "M308.49,82a3.3,3.3,0,0,1,2.34-2.51,1.93,1.93,0,0,1,1.58.18,2.14,2.14,0,0,1,.73,1.95,4.5,4.5,0,0,1-4.55,4.17");
    			attr(path81, "fill", "#fff");
    			attr(path82, "d", "M308.65,86.24h-.07a.5.5,0,0,1-.49-.51.49.49,0,0,1,.51-.49,3.84,3.84,0,0,0,2.75-1,4,4,0,0,0,1.29-2.66,1.76,1.76,0,0,0-.51-1.5,1.43,1.43,0,0,0-1.17-.1,2.81,2.81,0,0,0-2,2.12.51.51,0,0,1-.58.4.51.51,0,0,1-.4-.59,3.8,3.8,0,0,1,2.7-2.9,2.38,2.38,0,0,1,2,.25,2.55,2.55,0,0,1,.93,2.39,5,5,0,0,1-5,4.64Z");
    			attr(path82, "fill", "#231f20");
    			attr(ellipse1, "cx", "296.9");
    			attr(ellipse1, "cy", "77.43");
    			attr(ellipse1, "rx", "0.86");
    			attr(ellipse1, "ry", "0.46");
    			attr(ellipse1, "transform", "translate(134.53 337.79) rotate(-72.67)");
    			attr(ellipse1, "fill", "#231f20");
    			attr(path83, "d", "M294.85,87.35a7,7,0,0,0,1.94.85,2.69,2.69,0,0,0,2.69-.47,3.49,3.49,0,0,0,.57-1.08");
    			attr(path83, "fill", "#fff");
    			attr(path84, "d", "M297.86,88.85a4.72,4.72,0,0,1-1.2-.16,7.73,7.73,0,0,1-2.08-.92.5.5,0,0,1-.15-.69.49.49,0,0,1,.69-.15,6.58,6.58,0,0,0,1.8.79c.36.09,1.58.35,2.19-.32a3.12,3.12,0,0,0,.47-.93.5.5,0,0,1,.64-.29.5.5,0,0,1,.3.64,3.72,3.72,0,0,1-.67,1.25A2.63,2.63,0,0,1,297.86,88.85Z");
    			attr(path84, "fill", "#231f20");
    			attr(path85, "d", "M294.8,78.32s-3.86,4.4-2.92,5.35,3.19.47,3.19.47");
    			attr(path85, "fill", "#fff");
    			attr(path86, "d", "M293.84,84.77a3.26,3.26,0,0,1-2.31-.75c-1.11-1.11,1.34-4.26,2.89-6a.51.51,0,0,1,.71,0,.5.5,0,0,1,0,.71c-1.75,2-3.14,4.23-2.92,4.68.61.6,2.17.44,2.72.33a.5.5,0,1,1,.2,1A6.21,6.21,0,0,1,293.84,84.77Z");
    			attr(path86, "fill", "#231f20");
    			attr(path87, "d", "M278.66,122.47a.49.49,0,0,1-.44-.26.51.51,0,0,1,.2-.68c.15-.08,15.34-8.19,20.87-11.19a.49.49,0,0,1,.67.2.49.49,0,0,1-.2.68c-5.53,3-20.71,11.11-20.87,11.19A.46.46,0,0,1,278.66,122.47Z");
    			attr(path87, "fill", "#231f20");
    			attr(line0, "x1", "183.24");
    			attr(line0, "y1", "166.22");
    			attr(line0, "x2", "144.57");
    			attr(line0, "y2", "197.94");
    			attr(line0, "fill", "#fff");
    			attr(path88, "d", "M144.57,198.4a.46.46,0,0,1-.35-.17.46.46,0,0,1,.06-.65L183,165.86a.47.47,0,0,1,.65.06.46.46,0,0,1-.07.65l-38.66,31.72A.48.48,0,0,1,144.57,198.4Z");
    			attr(path88, "fill", "#d1d3d4");
    			attr(line1, "x1", "144.57");
    			attr(line1, "y1", "166.22");
    			attr(line1, "x2", "183.24");
    			attr(line1, "y2", "197.94");
    			attr(line1, "fill", "#fff");
    			attr(path89, "d", "M183.24,198.4a.46.46,0,0,1-.29-.11l-38.67-31.72a.46.46,0,0,1-.06-.65.47.47,0,0,1,.65-.06l38.66,31.72a.46.46,0,0,1,.07.65A.48.48,0,0,1,183.24,198.4Z");
    			attr(path89, "fill", "#d1d3d4");
    			attr(path90, "d", "M301,155.1a.49.49,0,0,1-.24-.93c.06,0,5.27-2.81,6.59-5.32a.49.49,0,0,1,.67-.2.49.49,0,0,1,.21.67c-1.46,2.78-6.78,5.61-7,5.73A.64.64,0,0,1,301,155.1Z");
    			attr(path90, "fill", "#fff");
    			attr(path91, "d", "M74.56,212.23a.49.49,0,0,1-.44-.26c-1.93-3.58-8.06-11.68-8.12-11.76a.5.5,0,1,1,.79-.6c.25.33,6.24,8.24,8.21,11.89a.49.49,0,0,1-.21.67A.46.46,0,0,1,74.56,212.23Z");
    			attr(path91, "fill", "#fff");
    			attr(g, "id", "_003");
    			attr(g, "data-name", "003");
    			attr(svg, "style", /*style*/ ctx[0]);
    			attr(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr(svg, "viewBox", "0 0 400 300");
    			attr(svg, "width", "406");
    			attr(svg, "height", "306");
    			attr(svg, "class", "illustration styles_illustrationTablet__1DWOa hide-on-small-only svelte-9109qr");
    		},
    		m(target, anchor) {
    			insert(target, svg, anchor);
    			append(svg, g);
    			append(g, path0);
    			append(g, rect0);
    			append(g, path1);
    			append(g, path2);
    			append(g, path3);
    			append(g, path4);
    			append(g, path5);
    			append(g, path6);
    			append(g, path7);
    			append(g, path8);
    			append(g, path9);
    			append(g, rect1);
    			append(g, path10);
    			append(g, path11);
    			append(g, path12);
    			append(g, path13);
    			append(g, path14);
    			append(g, rect2);
    			append(g, path15);
    			append(g, circle0);
    			append(g, circle1);
    			append(g, circle2);
    			append(g, path16);
    			append(g, path17);
    			append(g, path18);
    			append(g, path19);
    			append(g, path20);
    			append(g, path21);
    			append(g, path22);
    			append(g, path23);
    			append(g, path24);
    			append(g, path25);
    			append(g, path26);
    			append(g, path27);
    			append(g, rect3);
    			append(g, path28);
    			append(g, circle3);
    			append(g, path29);
    			append(g, path30);
    			append(g, path31);
    			append(g, path32);
    			append(g, path33);
    			append(g, path34);
    			append(g, path35);
    			append(g, path36);
    			append(g, path37);
    			append(g, path38);
    			append(g, path39);
    			append(g, path40);
    			append(g, path41);
    			append(g, path42);
    			append(g, ellipse0);
    			append(g, path43);
    			append(g, path44);
    			append(g, path45);
    			append(g, path46);
    			append(g, path47);
    			append(g, path48);
    			append(g, path49);
    			append(g, path50);
    			append(g, path51);
    			append(g, path52);
    			append(g, path53);
    			append(g, path54);
    			append(g, path55);
    			append(g, path56);
    			append(g, path57);
    			append(g, path58);
    			append(g, path59);
    			append(g, path60);
    			append(g, path61);
    			append(g, path62);
    			append(g, path63);
    			append(g, path64);
    			append(g, path65);
    			append(g, path66);
    			append(g, path67);
    			append(g, path68);
    			append(g, path69);
    			append(g, path70);
    			append(g, path71);
    			append(g, path72);
    			append(g, path73);
    			append(g, path74);
    			append(g, path75);
    			append(g, path76);
    			append(g, path77);
    			append(g, path78);
    			append(g, path79);
    			append(g, path80);
    			append(g, path81);
    			append(g, path82);
    			append(g, ellipse1);
    			append(g, path83);
    			append(g, path84);
    			append(g, path85);
    			append(g, path86);
    			append(g, path87);
    			append(g, line0);
    			append(g, path88);
    			append(g, line1);
    			append(g, path89);
    			append(g, path90);
    			append(g, path91);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*style*/ 1) {
    				attr(svg, "style", /*style*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(svg);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { style = null } = $$props;

    	$$self.$$set = $$props => {
    		if ("style" in $$props) $$invalidate(0, style = $$props.style);
    	};

    	return [style];
    }

    class WebDevelopment extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$6, safe_not_equal, { style: 0 });
    	}
    }

    /* src/sections/Somos.svelte generated by Svelte v3.35.0 */

    function create_fragment$5(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");

    			div.innerHTML = `<h4>Somos Kodefi,</h4> 
    <p class="svelte-17iv2o2">un equipo joven de programadores y desarrolladores,<wbr/> nos especializamos en el diseño y desarrollo de aplicaciones web.<br/></p> 
    <p class="svelte-17iv2o2">Utilizamos la última tecnología disponible para ofrecerte un producto moderno y durable en tiempo,<wbr/> nuestro constante aprendizaje garantiza nuestros resultados sigan las últimas tendencias en diseño y desarrollo.</p> 
    <p class="svelte-17iv2o2">Somos el punto de entrada a la digitalización de tu marca y de tu equipo.</p>`;

    			attr(div, "class", "svelte-17iv2o2");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    class Somos extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* src/sections/Servicios.svelte generated by Svelte v3.35.0 */

    function create_fragment$4(ctx) {
    	let div9;

    	return {
    		c() {
    			div9 = element("div");

    			div9.innerHTML = `<div class="col s12 center"><h3>Servicios</h3></div> 

    <div class="col s12 frontend valign-wrapper swap_img flex-direction-column svelte-1u6jnba"><img class="responsive-img svelte-1u6jnba" src="resources/web_dev.svg" alt=""/> 
        
        <div class="svelte-1u6jnba"><h4 class="lighter">Diseño y Desarrollo Web</h4> 
            <p class="svelte-1u6jnba">Desde la idea hasta el lanzamiento, ofrecemos seguimiento y desarrollo de todo tu sitio web, aplicando las mejores practicas de programación e ingeniería, SEO y accesibilidad para que llegues a tus clientes sin limites.</p></div></div> 

    <div class="col s12 backend valign-wrapper flex-direction-column svelte-1u6jnba"><div><h4 class="lighter">Servicios Backend</h4> 
            <p class="svelte-1u6jnba">Para requerimientos más avanzados, construimos servidores web a medida; chatbots, bases de datos, severless y cloud functions, API REST y más.<br/>
                Desarrollamos sistemas de tiempo real, administración y gestión.</p></div> 

        <img class="responsive-img svelte-1u6jnba" src="resources/web_service.svg" alt=""/></div> 

    <div class="col s12 review valign-wrapper swap_img flex-direction-column svelte-1u6jnba"><img class="responsive-img svelte-1u6jnba" src="resources/code_review.svg" alt=""/> 

        <div class="svelte-1u6jnba"><h4 class="lighter">Code Review</h4> 
            <p class="svelte-1u6jnba">Revisamos tus proyectos y asesoramos a tu equipo para seguir las mejores prácticas de arquitectura y programación; casos de uso, test unitarios, documentación, e implementación en cualquier paradigma de programación, en Javascript y Typescript.</p></div></div> 

    <div class="col s12 consulting valign-wrapper flex-direction-column svelte-1u6jnba"><div><h4 class="lighter">Mentoría y Consultoría</h4> 
            <p class="svelte-1u6jnba">Ofrecemos mentoría y consultoría para particulares y equipos en el área de la programación y el desarrollo web; HTML5, CSS3, Javascript/Typescript y NodeJS, siguiendo rutas de aprendizaje planificadas o personalizadas.</p></div> 
    
        <img class="responsive-img svelte-1u6jnba" src="resources/mentoring.svg" alt=""/></div>`;

    			attr(div9, "class", "row");
    		},
    		m(target, anchor) {
    			insert(target, div9, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div9);
    		}
    	};
    }

    class Servicios extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* src/sections/Contacto.svelte generated by Svelte v3.35.0 */

    function create_fragment$3(ctx) {
    	let div0;
    	let t1;
    	let div12;
    	let form;
    	let div2;
    	let div1;
    	let input0;
    	let t2;
    	let label0;
    	let t4;
    	let div4;
    	let div3;
    	let label1;
    	let input1;
    	let t5;
    	let span;
    	let t7;
    	let div6;
    	let div5;
    	let input2;
    	let t8;
    	let label2;
    	let t10;
    	let div8;
    	let div7;
    	let input3;
    	let t11;
    	let label3;
    	let t13;
    	let div10;
    	let div9;
    	let textarea;
    	let t14;
    	let label4;
    	let t16;
    	let div11;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div0 = element("div");
    			div0.innerHTML = `<h3>Conversemos</h3>`;
    			t1 = space();
    			div12 = element("div");
    			form = element("form");
    			div2 = element("div");
    			div1 = element("div");
    			input0 = element("input");
    			t2 = space();
    			label0 = element("label");
    			label0.textContent = "Nombre";
    			t4 = space();
    			div4 = element("div");
    			div3 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t5 = space();
    			span = element("span");
    			span.textContent = "Contact me";
    			t7 = space();
    			div6 = element("div");
    			div5 = element("div");
    			input2 = element("input");
    			t8 = space();
    			label2 = element("label");
    			label2.textContent = "Email";
    			t10 = space();
    			div8 = element("div");
    			div7 = element("div");
    			input3 = element("input");
    			t11 = space();
    			label3 = element("label");
    			label3.textContent = "Teléfono";
    			t13 = space();
    			div10 = element("div");
    			div9 = element("div");
    			textarea = element("textarea");
    			t14 = space();
    			label4 = element("label");
    			label4.textContent = "Mensaje";
    			t16 = space();
    			div11 = element("div");
    			div11.innerHTML = `<input style="color: #fff7f2; background-color: #669fa4" type="submit" value="Enviar" class="col s6 btn offset-s3 svelte-jwl1nf"/>`;
    			attr(div0, "class", "center");
    			input0.required = true;
    			attr(input0, "id", "name");
    			attr(input0, "type", "text");
    			attr(input0, "class", "validate svelte-jwl1nf");
    			attr(label0, "for", "name");
    			attr(label0, "class", "svelte-jwl1nf");
    			attr(div1, "class", "input-field col s12 svelte-jwl1nf");
    			attr(div2, "class", "row");
    			attr(input1, "type", "checkbox");
    			attr(input1, "class", "svelte-jwl1nf");
    			attr(label1, "class", "svelte-jwl1nf");
    			attr(div3, "class", "input-field col s12 svelte-jwl1nf");
    			attr(div4, "class", "row trap svelte-jwl1nf");
    			input2.required = true;
    			attr(input2, "id", "email");
    			attr(input2, "type", "email");
    			attr(input2, "class", "validate svelte-jwl1nf");
    			attr(label2, "for", "email");
    			attr(label2, "class", "svelte-jwl1nf");
    			attr(div5, "class", "input-field col s12 svelte-jwl1nf");
    			attr(div6, "class", "row");
    			attr(input3, "id", "telephone");
    			attr(input3, "type", "tel");
    			attr(input3, "class", "validate svelte-jwl1nf");
    			attr(label3, "for", "telephone");
    			attr(label3, "class", "svelte-jwl1nf");
    			attr(div7, "class", "input-field col s12 svelte-jwl1nf");
    			attr(div8, "class", "row");
    			attr(textarea, "maxlength", "1850");
    			textarea.required = true;
    			attr(textarea, "name", "message");
    			attr(textarea, "id", "message");
    			attr(textarea, "class", "materialize-textarea svelte-jwl1nf");
    			attr(label4, "for", "message");
    			attr(label4, "class", "svelte-jwl1nf");
    			attr(div9, "class", "input-field col s12 svelte-jwl1nf");
    			attr(div10, "class", "row");
    			attr(div11, "class", "row");
    			attr(form, "class", "col s12 l8 offset-l2");
    			attr(div12, "class", "row");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t1, anchor);
    			insert(target, div12, anchor);
    			append(div12, form);
    			append(form, div2);
    			append(div2, div1);
    			append(div1, input0);
    			set_input_value(input0, /*name*/ ctx[1]);
    			append(div1, t2);
    			append(div1, label0);
    			append(form, t4);
    			append(form, div4);
    			append(div4, div3);
    			append(div3, label1);
    			append(label1, input1);
    			input1.checked = /*trap*/ ctx[0];
    			append(label1, t5);
    			append(label1, span);
    			append(form, t7);
    			append(form, div6);
    			append(div6, div5);
    			append(div5, input2);
    			set_input_value(input2, /*email*/ ctx[2]);
    			append(div5, t8);
    			append(div5, label2);
    			append(form, t10);
    			append(form, div8);
    			append(div8, div7);
    			append(div7, input3);
    			set_input_value(input3, /*telephone*/ ctx[3]);
    			append(div7, t11);
    			append(div7, label3);
    			append(form, t13);
    			append(form, div10);
    			append(div10, div9);
    			append(div9, textarea);
    			set_input_value(textarea, /*message*/ ctx[4]);
    			append(div9, t14);
    			append(div9, label4);
    			append(form, t16);
    			append(form, div11);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen(input1, "change", /*input1_change_handler*/ ctx[7]),
    					listen(input2, "input", /*input2_input_handler*/ ctx[8]),
    					listen(input3, "input", /*input3_input_handler*/ ctx[9]),
    					listen(textarea, "input", /*textarea_input_handler*/ ctx[10]),
    					listen(form, "submit", prevent_default(/*process*/ ctx[5]))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*name*/ 2 && input0.value !== /*name*/ ctx[1]) {
    				set_input_value(input0, /*name*/ ctx[1]);
    			}

    			if (dirty & /*trap*/ 1) {
    				input1.checked = /*trap*/ ctx[0];
    			}

    			if (dirty & /*email*/ 4 && input2.value !== /*email*/ ctx[2]) {
    				set_input_value(input2, /*email*/ ctx[2]);
    			}

    			if (dirty & /*telephone*/ 8) {
    				set_input_value(input3, /*telephone*/ ctx[3]);
    			}

    			if (dirty & /*message*/ 16) {
    				set_input_value(textarea, /*message*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t1);
    			if (detaching) detach(div12);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const webhook = {
    		base: "https://discord.com/api/webhooks/",
    		id: "848198980553932830/mqkPJZ3FAlobu763xJte4dMBePSCrhGp9F4TpksgU6_QdE3thiZU6qPFNn5r3XEaG2lH"
    	};

    	let trap = false;
    	let name = "";
    	let email = "";
    	let telephone = "";
    	let message = "";

    	function process() {
    		if (trap) return;
    		if (message.length > 1850) $$invalidate(4, message = message.slice(0, 1850));

    		fetch(`${webhook.base}${webhook.id}`, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify({
    				content: `**${name || "John Doe"} ─ ${email || "johndoe@email.com"} ─ ${telephone || "+000000000000"}**\n${message || "No busco nada"}`
    			})
    		}).then(() => window.location.reload());
    	}

    	function input0_input_handler() {
    		name = this.value;
    		$$invalidate(1, name);
    	}

    	function input1_change_handler() {
    		trap = this.checked;
    		$$invalidate(0, trap);
    	}

    	function input2_input_handler() {
    		email = this.value;
    		$$invalidate(2, email);
    	}

    	function input3_input_handler() {
    		telephone = this.value;
    		$$invalidate(3, telephone);
    	}

    	function textarea_input_handler() {
    		message = this.value;
    		$$invalidate(4, message);
    	}

    	return [
    		trap,
    		name,
    		email,
    		telephone,
    		message,
    		process,
    		input0_input_handler,
    		input1_change_handler,
    		input2_input_handler,
    		input3_input_handler,
    		textarea_input_handler
    	];
    }

    class Contacto extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src/components/Icon.svelte generated by Svelte v3.35.0 */

    function create_fragment$2(ctx) {
    	let div;
    	let a;
    	let img;
    	let img_src_value;
    	let a_title_value;

    	return {
    		c() {
    			div = element("div");
    			a = element("a");
    			img = element("img");
    			if (img.src !== (img_src_value = /*icon*/ ctx[0])) attr(img, "src", img_src_value);
    			attr(img, "alt", /*alt*/ ctx[2]);
    			attr(img, "class", "svelte-4ashcp");
    			attr(a, "target", "_blank");
    			attr(a, "href", /*to*/ ctx[1]);
    			attr(a, "title", a_title_value = /*title*/ ctx[3] || /*alt*/ ctx[2]);
    			set_style(div, "--icon-size", /*size*/ ctx[4]);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, a);
    			append(a, img);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*icon*/ 1 && img.src !== (img_src_value = /*icon*/ ctx[0])) {
    				attr(img, "src", img_src_value);
    			}

    			if (dirty & /*alt*/ 4) {
    				attr(img, "alt", /*alt*/ ctx[2]);
    			}

    			if (dirty & /*to*/ 2) {
    				attr(a, "href", /*to*/ ctx[1]);
    			}

    			if (dirty & /*title, alt*/ 12 && a_title_value !== (a_title_value = /*title*/ ctx[3] || /*alt*/ ctx[2])) {
    				attr(a, "title", a_title_value);
    			}

    			if (dirty & /*size*/ 16) {
    				set_style(div, "--icon-size", /*size*/ ctx[4]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { icon } = $$props;
    	let { to } = $$props;
    	let { alt } = $$props;
    	let { title } = $$props;
    	let { size = "50px" } = $$props;

    	$$self.$$set = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("to" in $$props) $$invalidate(1, to = $$props.to);
    		if ("alt" in $$props) $$invalidate(2, alt = $$props.alt);
    		if ("title" in $$props) $$invalidate(3, title = $$props.title);
    		if ("size" in $$props) $$invalidate(4, size = $$props.size);
    	};

    	return [icon, to, alt, title, size];
    }

    class Icon extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance, create_fragment$2, safe_not_equal, {
    			icon: 0,
    			to: 1,
    			alt: 2,
    			title: 3,
    			size: 4
    		});
    	}
    }

    /* src/sections/Footer.svelte generated by Svelte v3.35.0 */

    function create_fragment$1(ctx) {
    	let footer;
    	let div1;
    	let kodefi;
    	let t0;
    	let div0;
    	let icon0;
    	let t1;
    	let icon1;
    	let t2;
    	let icon2;
    	let t3;
    	let icon3;
    	let current;
    	kodefi = new Kodefi({ props: { type: "light" } });

    	icon0 = new Icon({
    			props: {
    				icon: "resources/whatsapp.png",
    				title: "Escribenos un whatsapp",
    				alt: "Whatsapp",
    				to: "https://wa.me/542945648669?text=Hola!%20He%20visto%20su%20sitio%20web%20y%20quisiera%20conversar%20más%20al%20respecto.",
    				size: "32px"
    			}
    		});

    	icon1 = new Icon({
    			props: {
    				icon: "resources/messenger.png",
    				title: "Envianos un mensaje",
    				alt: "Messenger",
    				to: "https://m.me/111272334491969",
    				size: "32px"
    			}
    		});

    	icon2 = new Icon({
    			props: {
    				icon: "resources/github.png",
    				title: "Conoce nuestros repositorios",
    				alt: "Github",
    				to: "https://github.com/Kodefi",
    				size: "32px"
    			}
    		});

    	icon3 = new Icon({
    			props: {
    				icon: "resources/linkedin.png",
    				title: "Siguenos en Linkedin",
    				alt: "Linkedin",
    				to: "https://linkedin.com/company/kodefi",
    				size: "32px"
    			}
    		});

    	return {
    		c() {
    			footer = element("footer");
    			div1 = element("div");
    			create_component(kodefi.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			create_component(icon0.$$.fragment);
    			t1 = space();
    			create_component(icon1.$$.fragment);
    			t2 = space();
    			create_component(icon2.$$.fragment);
    			t3 = space();
    			create_component(icon3.$$.fragment);
    			attr(div0, "class", "social svelte-jlyrml");
    			attr(div1, "class", "container");
    			attr(footer, "class", "page-footer svelte-jlyrml");
    		},
    		m(target, anchor) {
    			insert(target, footer, anchor);
    			append(footer, div1);
    			mount_component(kodefi, div1, null);
    			append(div1, t0);
    			append(div1, div0);
    			mount_component(icon0, div0, null);
    			append(div0, t1);
    			mount_component(icon1, div0, null);
    			append(div0, t2);
    			mount_component(icon2, div0, null);
    			append(div0, t3);
    			mount_component(icon3, div0, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(kodefi.$$.fragment, local);
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			transition_in(icon2.$$.fragment, local);
    			transition_in(icon3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(kodefi.$$.fragment, local);
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			transition_out(icon2.$$.fragment, local);
    			transition_out(icon3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(footer);
    			destroy_component(kodefi);
    			destroy_component(icon0);
    			destroy_component(icon1);
    			destroy_component(icon2);
    			destroy_component(icon3);
    		}
    	};
    }

    class Footer extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/App.svelte generated by Svelte v3.35.0 */

    function create_fragment(ctx) {
    	let header;
    	let navbar;
    	let t0;
    	let webdevelopment;
    	let t1;
    	let div1;
    	let div0;
    	let h3;
    	let t5;
    	let h5;
    	let t8;
    	let buttonprimary;
    	let t9;
    	let main;
    	let div2;
    	let somos;
    	let t10;
    	let div3;
    	let comolohacemos;
    	let t11;
    	let div4;
    	let servicios;
    	let t12;
    	let div5;
    	let contacto;
    	let t13;
    	let footer;
    	let current;
    	navbar = new Navbar({});

    	webdevelopment = new WebDevelopment({
    			props: {
    				style: "position: absolute; right: 0; width: 50vw; height: calc(100% - 50px);"
    			}
    		});

    	buttonprimary = new ButtonPrimary({
    			props: {
    				href: "#contacto",
    				content: "Conversemos",
    				hex_color: "#669fa4",
    				style: "width:100%; margin: 25px 0"
    			}
    		});

    	somos = new Somos({});
    	comolohacemos = new ComoLoHacemos({});
    	servicios = new Servicios({});
    	contacto = new Contacto({});
    	footer = new Footer({});

    	return {
    		c() {
    			header = element("header");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			create_component(webdevelopment.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.innerHTML = `Ponemos <br/>tu emprendimiento<br/> en internet.`;
    			t5 = space();
    			h5 = element("h5");
    			h5.innerHTML = `Planificamos, diseñamos, desarrollamos<br/> y ponemos tu sitio en la web.`;
    			t8 = space();
    			create_component(buttonprimary.$$.fragment);
    			t9 = space();
    			main = element("main");
    			div2 = element("div");
    			create_component(somos.$$.fragment);
    			t10 = space();
    			div3 = element("div");
    			create_component(comolohacemos.$$.fragment);
    			t11 = space();
    			div4 = element("div");
    			create_component(servicios.$$.fragment);
    			t12 = space();
    			div5 = element("div");
    			create_component(contacto.$$.fragment);
    			t13 = space();
    			create_component(footer.$$.fragment);
    			attr(h3, "class", "svelte-1otd6r7");
    			attr(h5, "class", "svelte-1otd6r7");
    			attr(div0, "class", "header_content svelte-1otd6r7");
    			attr(div1, "class", "container header_container svelte-1otd6r7");
    			attr(header, "class", "svelte-1otd6r7");
    			attr(div2, "class", "container somos-padding svelte-1otd6r7");
    			attr(div3, "class", "container-fluid");
    			attr(div3, "id", "como_lo_hacemos");
    			attr(div4, "class", "container svelte-1otd6r7");
    			attr(div4, "id", "servicios");
    			attr(div5, "class", "container svelte-1otd6r7");
    			attr(div5, "id", "contacto");
    			attr(main, "class", "svelte-1otd6r7");
    		},
    		m(target, anchor) {
    			insert(target, header, anchor);
    			mount_component(navbar, header, null);
    			append(header, t0);
    			mount_component(webdevelopment, header, null);
    			append(header, t1);
    			append(header, div1);
    			append(div1, div0);
    			append(div0, h3);
    			append(div0, t5);
    			append(div0, h5);
    			append(div0, t8);
    			mount_component(buttonprimary, div0, null);
    			insert(target, t9, anchor);
    			insert(target, main, anchor);
    			append(main, div2);
    			mount_component(somos, div2, null);
    			append(main, t10);
    			append(main, div3);
    			mount_component(comolohacemos, div3, null);
    			append(main, t11);
    			append(main, div4);
    			mount_component(servicios, div4, null);
    			append(main, t12);
    			append(main, div5);
    			mount_component(contacto, div5, null);
    			append(main, t13);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(webdevelopment.$$.fragment, local);
    			transition_in(buttonprimary.$$.fragment, local);
    			transition_in(somos.$$.fragment, local);
    			transition_in(comolohacemos.$$.fragment, local);
    			transition_in(servicios.$$.fragment, local);
    			transition_in(contacto.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(webdevelopment.$$.fragment, local);
    			transition_out(buttonprimary.$$.fragment, local);
    			transition_out(somos.$$.fragment, local);
    			transition_out(comolohacemos.$$.fragment, local);
    			transition_out(servicios.$$.fragment, local);
    			transition_out(contacto.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(header);
    			destroy_component(navbar);
    			destroy_component(webdevelopment);
    			destroy_component(buttonprimary);
    			if (detaching) detach(t9);
    			if (detaching) detach(main);
    			destroy_component(somos);
    			destroy_component(comolohacemos);
    			destroy_component(servicios);
    			destroy_component(contacto);
    			destroy_component(footer);
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
