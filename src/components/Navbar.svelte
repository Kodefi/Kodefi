<script lang="ts">
    import Kodefi from "./svgs/Kodefi.svelte"
    import ButtonPrimary from "./ButtonPrimary.svelte"
</script>
<div class="navbar-fixed">
    <nav>
        <div class="nav-wrapper">
            <a href="/" class="brand-logo"><Kodefi style="vertical-align:middle;" type="light"/></a>
            <ul id="nav-mobile" class="right">
                <li class="hide-on-med-and-down"><a href="#servicios">Servicios</a></li>
                <li class="hide-on-med-and-down desactivado"><a href="/">Blog</a></li>
                <li class="hide-on-med-and-down"><a target="_blank" href="https://github.com/Kodefi">Open Source</a></li>
                <li class="hide-on-small-only">
                    <ButtonPrimary href="#contacto" content="Contacto" hex_color="#669fa4"/>
                </li>
            </ul>

        </div>
    </nav>
</div>
<style>
    nav {
        border: none !important;
        /* box-shadow: unset !important; */
        height: 80px !important;
        line-height: 80px !important;
        background-color: #ed564e;
        padding: 0 15%;
    }

    a {
        color: #fff7f2 !important;
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
    
    @media only screen and (max-width: 601px){
        .brand-logo {
            left: 0;
            -webkit-transform: unset;
            transform: unset;

        }
    }

    @media only screen and (max-width: 993px){ 
        nav {
            padding: 0 5%;
        }
    }
    
</style>