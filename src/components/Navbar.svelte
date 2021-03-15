<script lang="ts">
    import Kodefisvg from "./Kodefisvg.svelte"
    import ButtonPrimary from "./ButtonPrimary.svelte"
</script>

<nav class="transparent">
    <div class="nav-wrapper">
        <a href="/" class="brand-logo"><Kodefisvg type="dark"/></a>
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
        border: none;
        box-shadow: unset;
        height: 80px;
        line-height: 80px;
    }

    a {
        color: #1e1e24;
        user-select: none;
        font-size: 1.15rem;
    }

    .desactivado {
        user-select: none;
        pointer-events: none;
    }

    .desactivado:hover {
        cursor: pointer;
    }

    .desactivado a {
        color: gray
    }
</style>