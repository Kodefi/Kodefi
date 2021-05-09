<script>
import Card from "../components/Card.svelte";

</script>
<div class="row">
    <div class="col s10 m4 l3 l1440 offset-s1 offset-m2 offset-l1440">
        <Card
            title="Escuchamos tus necesidades"
            content="Cuéntanos acerca de tu proyecto, <wbr>nuestro equipo esta capacitado para <wbr>orientarte y resolver tus inquietudes<wbr> desde el principio tu idea <wbr>hasta la finalización del proyecto."
            image_src="resources/consulting.svg"
            image_alt="Te escuchamos"
            text_color="#fff7f2"
        />
    </div>

    <div class="col s10 m4 l3 l1440 offset-s1">
        <Card
            title="Realizamos una propuesta"
            content="Tras escuchar tus ideas, <wbr>nos dedicaremos a evaluar distintas opciones, <wbr>aquellas que sean las más eficiente en cuanto a tiempo, <wbr>desarrollo y beneficio para ti. <wbr>Nuestro objetivo es darte la mejor solución para tus proyectos."
            image_src="resources/presentation.svg"
            image_alt="Proponemos"
            text_color="#fff7f2"
        />
    </div>

    <div class="col s10 m4 l3 l1440 offset-m2 offset-s1">
        <Card
            title="Analizamos en conjunto"
            content="Una vez hemos encontrado una propuesta adecuada <wbr>comenzamos a trabajar junto a ti, <wbr>desarrollando una estrategia juntos <wbr>e iterando en el desarrollo, <wbr>ofreciendo soluciones inteligentes <wbr>para alcanzar el objetivo y concretar tus ideas."
            image_src="resources/meeting.svg"
            image_alt="Analizamos"
            text_color="#fff7f2"
        />
    </div>

    <div class="col s10 m4 l3 l1440 offset-s1">
        <Card
            title="Desarrollamos <wbr>y entregamos"
            content="Una vez lograda una estrategia clara y eficiente, <wbr>desarrollaremos tu producto, <wbr>coordinaremos la publicación <wbr>y haremos un seguimiento constante del resultado, <wbr>asegurándonos que todo funcione <wbr>correctamente."
            image_src="resources/launch.svg"
            image_alt="Entregamos"
            text_color="#fff7f2"
        />
    </div>

</div>

<style>
    .row {
        padding: 160px 0;
        background: #ed564e;
        background: linear-gradient(179deg, #fff7f2 5%, #ed564e 5.1%, #ed564e 95%, #fff7f2 95.1%); 
    }   

    @media only screen and (min-width: 1440px){
        .offset-l1440 {
            margin-left: calc(8.3333333333% * 2) !important;
        }

        .l1440 {
            width: calc(8.3333333333% * 2) !important;
        }
    }
</style>
