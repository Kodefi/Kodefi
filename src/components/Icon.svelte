<script lang="ts">
    export let icon:string;
    export let to:string;
    export let alt:string;
    export let title:string;
    export let size = "50px";
    export let clas:string;
</script>

<div style="--icon-size: {size}" class="{clas}">
    <a target="_blank" href="{to}" title="{title || alt}">
        <img src="{icon}" alt="{alt}">
    </a>
</div>

<style>
    img {
        height: var(--icon-size);
        width: var(--icon-size);
    }
</style>