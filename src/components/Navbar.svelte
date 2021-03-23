<script lang="ts">
    import Kodefisvg from "./Kodefisvg.svelte"
    import ButtonPrimary from "./ButtonPrimary.svelte"
</script>

<nav class="transparent">
    <div class="nav-wrapper">
        <a href="/" class="brand-logo"><Kodefisvg style="vertical-align:sub;" type="dark"/></a>
        <ul id="nav-mobile" class="right">
            <li class="hide-on-med-and-down"><a href="sass.html">Servicios</a></li>
            <li class="hide-on-med-and-down desactivado"><a href="badges.html">Blog</a></li>
            <li class="hide-on-med-and-down desactivado"><a href="badges.html">Open Source</a></li>
            <li class="hide-on-med-and-down"><a href="collapsible.html">Equipo</a></li>
            <li class="hide-on-small-only">
                <ButtonPrimary content="Contacto" hex_color="#e54b4b"/>
            </li>
        </ul>
        
    </div>
</nav>

<style>
    nav {
        border: none !important;
        box-shadow: unset !important;
        height: 80px !important;
        line-height: 80px !important;
    }

    a {
        color: #1e1e24 !important;
        user-select: none !important;
        font-size: 1.15rem !important;
    }

    .desactivado {
        user-select: none !important;
        pointer-events: none !important;
    }

    .desactivado:hover {
        cursor: pointer !important;
    }

    .desactivado a {
        color: gray !important
    }
</style>