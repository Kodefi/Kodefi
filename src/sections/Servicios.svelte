<div class="row">
    <div class="col s12 center">
        <h3>Servicios</h3>
    </div>

    <div class="col s12 frontend valign-wrapper swap_img flex-direction-column">
        <img class="responsive-img" src="resources/web_dev.svg" alt="">
        
        <div>
            <h4 class="lighter">Diseño y Desarrollo Web</h4>
            <p>Desde la idea hasta el lanzamiento, ofrecemos seguimiento y desarrollo de todo tu sitio web, aplicando las mejores practicas de programación e ingeniería, SEO y accesibilidad para que llegues a tus clientes sin limites.</p>
        </div>
    </div>

    <div class="col s12 backend valign-wrapper flex-direction-column">
        <div>
            <h4 class="lighter">Servicios Backend</h4>
            <p>Para requerimientos más avanzados, construimos servidores web a medida; chatbots, bases de datos, severless y cloud functions, API REST y más.<br>
                Desarrollamos sistemas de tiempo real, administración y gestión.</p>
        </div>

        <img class="responsive-img" src="resources/web_service.svg" alt="">
    </div>

    <div class="col s12 review valign-wrapper swap_img flex-direction-column">
        <img class="responsive-img" src="resources/code_review.svg" alt="">

        <div>
            <h4 class="lighter">Code Review</h4>
            <p>Revisamos tus proyectos y asesoramos a tu equipo para seguir las mejores prácticas de arquitectura y programación; casos de uso, test unitarios, documentación, e implementación en cualquier paradigma de programación, en Javascript y Typescript.</p>
        </div>
    </div>

    <div class="col s12 consulting valign-wrapper flex-direction-column">
        <div>
            <h4 class="lighter">Mentoría y Consultoría</h4>
            <p>Ofrecemos mentoría y consultoría para particulares y equipos en el área de la programación y el desarrollo web; HTML5, CSS3, Javascript/Typescript y NodeJS, siguiendo rutas de aprendizaje planificadas o personalizadas.</p>
        </div>
    
        <img class="responsive-img" src="resources/mentoring.svg" alt="">
    </div>
</div>

<style>
    p {
        font-size: 1.5rem;
        font-weight: lighter;
        padding: 10px 0;
    }

    img {
        max-width: 40%;
    }

    @media only screen and (max-width: 993px){
        p { 
            font-size: 1.25rem;
        }

        .flex-direction-column {
            flex-direction: column !important;

        }

        .swap_img img {
            -webkit-box-ordinal-group: 2;
            -moz-box-ordinal-group: 2;
            -ms-flex-order: 2;
            -webkit-order: 2;
            order: 2;
        }

        .swap_img div {
            -webkit-box-ordinal-group: 1;
            -moz-box-ordinal-group: 1;
            -ms-flex-order: 1;
            -webkit-order: 1;
            order: 1;
        }

        img {
            max-width: 60%;
        }
    }

    @media only screen and (max-width: 601px){
        p { 
            font-size: 1rem !important;
        }

        img {
            max-width: 80%;
        }
    }
</style>