<div class="row">
    <div class="col s12 m12 l6 frontend">
        <h4 class="lighter">Diseño y Desarrollo Web</h4>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus, reprehenderit cumque nisi minima molestiae libero unde repellat atque, accusamus totam recusandae eum! Cum eligendi a quos quis corrupti minima sint?</p>
    </div>
    <div class="col s12 m12 l6 backend">
        <h4 class="lighter">Web Sevices</h4>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus, reprehenderit cumque nisi minima molestiae libero unde repellat atque, accusamus totam recusandae eum! Cum eligendi a quos quis corrupti minima sint?</p>
    </div>
</div>
<div class="row">
    <div class="col s12 m12 l6 review">
        <h4 class="lighter">Code Review</h4>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus, reprehenderit cumque nisi minima molestiae libero unde repellat atque, accusamus totam recusandae eum! Cum eligendi a quos quis corrupti minima sint?</p>
    </div>
    <div class="col s12 m12 l6 consulting">
        <h4 class="lighter">Mentoría y Consultoría</h4>
        <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Minus, reprehenderit cumque nisi minima molestiae libero unde repellat atque, accusamus totam recusandae eum! Cum eligendi a quos quis corrupti minima sint?</p>
    </div>
</div>

<style>
    .row {
        margin: 0
    }

    .frontend, .backend, .review, .consulting {
        min-height: 40vh !important;
    }

    .frontend, .consulting {
        background-color: #ed564e;
        color: #fff7f2;
    }

    .frontend, .review {
        padding-left: 15% !important;
    }

    .backend, .consulting {
        padding-right: 15% !important;
    }

    @media only screen and (max-width: 993px){
        .frontend, .backend, .review, .consulting {
            padding: 7.5% !important;
        }

        .backend, .consulting {
            background-color: #fff7f2;
            color: #1e1e24;
        }

        .review {
            background-color: #ed564e;
            color: #fff7f2;
        }
    }

    @media only screen and (max-width: 601px){
        .frontend, .backend, .review, .consulting {
            padding: 5% !important;
        }
    }
</style>