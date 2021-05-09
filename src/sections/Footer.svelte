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
                alt="Escribenos un whatsapp"
                size="32px"
            />
            <Icon
                icon="resources/github.png"
                alt="Github"
                to="https://github.com/Kodefi"
                size="32px"
            />
            <Icon
                icon="resources/linkedin.png"
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
        grid-template-columns: 1fr 1fr 1fr;
        column-gap: 15px;
    }
</style>