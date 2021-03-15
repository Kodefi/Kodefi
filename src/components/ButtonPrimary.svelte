<!-- Botón primario
    Recibe:
        * waves: "light" | "dark"
        * size: "large" | "small" | "medium"
        * icon: "icon-name" - Nombre del icono: https://materializecss.com/icons.html
        * icon_position: "left" | "right"
        * content: string (cualquier texto)
        * disabled: boolean
        * href: string
        * color: string - Colores de MaterializeCSS: https://materializecss.com/color.html
        * float: "left" | "right" | null
        * hex_color: string | null - Color en hexadecimal (superpone la propiedad `color`)
-->

<script lang="ts">
    export let waves:"light" | "dark" = "light";
    export let size:"large" | "small" | "medium" = "medium";
    export let icon:string|null = null
    export let icon_position:"left" | "right" = "left";
    export let disabled:boolean = false;
    export let color:string = "teal"
    export let content:string;
    export let href:string;
    export let float:"left" | "right" | null = null
    export let hex_color:string|null = null 
</script>

<a href={href} class="waves-effect waves-{waves} btn{size != 'medium' ? `-${size}` : ''} {disabled ? 'disabled' : ''} {hex_color ? '' : color} {float ? float : ''}" style={hex_color ? `background-color: ${hex_color} !important` : ''}>
    {icon ? `<i class="material-icon ${icon_position}"">${icon}}</i>` : ""}
    {content}
</a>
