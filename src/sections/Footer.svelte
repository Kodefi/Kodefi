<script>
import Kodefi from "../components/svgs/Kodefi.svelte";
import Icon from "../components/Icon.svelte";

</script>
<footer class="page-footer">
    <div class="container">
        <Kodefi type="light"/>
        <div class="social">
            <Icon
                icon="resources/whatsapp.png"
                title="Escribenos un whatsapp"
                alt="Whatsapp"
                to="https://wa.me/542945648669?text=Hola!%20He%20visto%20su%20sitio%20web%20y%20quisiera%20conversar%20más%20al%20respecto."
                size="32px"
            />
            <Icon
                icon="resources/messenger.png"
                title="Envianos un mensaje"
                alt="Messenger"
                to="https://m.me/111272334491969"
                size="32px"
            />
            <Icon
                icon="resources/github.png"
                title="Conoce nuestros repositorios"
                alt="Github"
                to="https://github.com/Kodefi"
                size="32px"
                clas="hide-on-small-only"
            />
            <Icon
                icon="resources/linkedin.png"
                title="Siguenos en Linkedin"
                alt="Linkedin"
                to="https://linkedin.com/company/kodefi"
                size="32px"
            />
        </div>
    </div>
</footer>

<style>
    footer {
        background-color: #ed564e;
    }

    .page-footer {
        padding: 15px 0 !important;
    }

    .social {
        float: right;
        display: grid;
        grid-template-rows: 1fr;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        column-gap: 15px;
    }

    @media only screen and (max-width: 601px){
        .social {
            grid-template-columns: 1fr 1fr 1fr;
        }
    }
</style>