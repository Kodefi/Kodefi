<script lang="ts">
	import ButtonPrimary from "./components/ButtonPrimary.svelte";
	import ComoLoHacemos from "./sections/ComoLoHacemos.svelte";
	import Navbar from "./components/Navbar.svelte";
	import WebDevelopment from "./components/svgs/WebDevelopment.svelte";
	import Somos from "./sections/Somos.svelte";
	import Servicios from "./sections/Servicios.svelte";
	import Contacto from "./sections/Contacto.svelte";
	import Footer from "./sections/Footer.svelte";
</script>

<header>
	<Navbar/>
	<WebDevelopment style="position: absolute; right: 0; width: 50vw; height: calc(100% - 50px);"/>
	<div class="container header_container">
		<div class="header_content">
			<h3>Ponemos <br>tu emprendimiento<br> en internet.</h3>
			<h5>Planificamos, diseñamos, desarrollamos<br> y ponemos tu sitio en la web.</h5>
			<ButtonPrimary href="#contacto" content="Conversemos" hex_color="#669fa4" style="width:100%; margin: 25px 0"/>
		</div>
	</div>
</header>
<main>
	<div class="container somos-padding">
		<Somos/>
	</div>

	<div class="container-fluid" id="como_lo_hacemos">
		<ComoLoHacemos/>
	</div>

	<div class="container" id="servicios">
		<Servicios/>
	</div>

	<div class="container" id="contacto">
		<Contacto/>
	</div>

	<Footer/>
</main>

<style>
	header {
		position: relative;
		background: #ed564e;
		background: linear-gradient(120deg, rgba(237,86,78,1) 65%, #fff7f2 65.05%); 
		color: #fff7f2;
		padding-bottom: 50px;
	}

	.header_container {
		/* height: 70vh;
		position: absolute;
		top: 0;
		left: 15%;
		
		min-height: max-content; */
		position: relative;
		width: max-content;
		margin: 0 0 0 15%;
		height: 50vh;
	}

	.header_content {
		position: relative;
		top: 50%;
		transform: translateY(-50%);
	}

	main {
		position: relative;
		background-color: #fff7f2;
		/* margin-top: -75px;
		border: 1px solid rgba(0, 0, 0, 0.15);
		border-top: 3px solid #ed564e;
		border-radius: 5px;
		box-shadow: 0 0 5px 1px rgba(0, 0, 0, 0.1); */
	}

	.somos-padding {
		padding: 80px 0;
	}

	#servicios, #contacto {
		padding-top: 81px;
	}
	
	@media only screen and (max-height: 650px){
		.header_container {
			height: unset;
		}
		.header_content {
			top: 0;
			transform: unset;
			padding-top: 25px
		}
	}

	@media only screen and (max-width: 601px){
		h3 {
			font-size: 2.28rem;
		}
		h5 {
			font-size: 1rem;
		}
		.header_container {
			margin: 0 auto;
		}
		.header_content {
			text-align: center;
			padding: 50px 5% 0 5%;
		}
		header {
			background: #ed564e !important;
		}
		.somos-padding {
			padding: 25px 0px !important;
		}
	}

	@media only screen and (max-width: 993px){
		h3 {
			font-size: 2.28rem;
		}
		h5 {
			font-size: 1.25rem;
		}
		.somos-padding {
			padding: 25px
		}
	}
</style>