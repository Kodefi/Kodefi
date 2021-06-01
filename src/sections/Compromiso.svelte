<script>
    import Card from "../components/Card.svelte";
    import ButtonPrimary from "../components/ButtonPrimary.svelte";
</script>
<div class="row">
    <div class="row">
        <h4 class="center lighter">Compromiso social y ambiental</h4>
        <p class="center">En Kodefi apoyamos las iniciativas medioambientales y promovemos el desarrollo de nuevos emprendimientos.</p>
        <p class="center">Ponte en <a href="#contacto">contacto</a> con nosotros y aplica ahora.</p>
    </div>
    <div class="col s10 m6 fhd4 offset-s1 offset-fhd2">
        <Card 
            title="Organizaciones<br>medioambientales<span style='font-size:12px;vertical-align: bottom;'>*</span>"
            content="Si tenés una organización o realizas actividades respecto al cuidado del medioambiente, desde Kodefi queremos ayudar. Ofrecemos hasta un 30% de descuento y opciones de pago especiales en la mayoría de nuestros servicios."
            image_src="resources/ambiente.svg"
            image_alt="Medioambiente"
        />
    </div>
    <div class="col s10 m6 fhd4 offset-s1">
        <Card
            title="Nuevos<br>emprendimientos<span style='font-size:12px;vertical-align: bottom;'>*</span>"
            content="Si estás iniciando un nuevo emprendimiento y querés posicionarte online, desde Kodefi queremos hacer despegar tu negocio. Ofrecemos hasta un 30% de descuento y opciones de pago especiales en la mayoría de nuestros servicios."
            image_src="resources/emprendimiento.svg"
            image_alt="Emprendimientos"/>
    </div>
    <div class="row">
        <p class="center disc">* El equipo de Kodefi se reserva el derecho a elegir los proyectos a apoyar</p>
    </div>
    <div class="row">
        <div class="col s12 m10 offset-m1 l8 offset-l2">
            <ButtonPrimary href="#contacto" content="Aplicar ahora" style="width:100%" hex_color="#669fa4"/>
        </div>
    </div>
</div>

<style>
    .disc {
        float: right;
        font-size: 12px !important;
        color: rgba(0, 0, 0, 0.5)
    }

    p {
        font-size: 1.25rem;
        font-weight: lighter;
    }

    /**full hd*/
    @media only screen and (min-width: 1920px){
        .offset-fhd2 {
            margin-left: calc(8.3333333333% * 2) !important;
        }

        .fhd4 {
            width: calc(8.3333333333% * 4) !important;
        }
    }

    @media only screen and (max-width: 993px){
        p { 
            font-size: 1.25rem;
        }
    }

    @media only screen and (max-width: 601px){
        p { 
            font-size: 1rem !important;
        }
    }
</style>