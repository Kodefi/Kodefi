<script lang="ts">
    export let icon:string;
    export let to:string;
    export let alt:string;
    export let size = "50px";
</script>

<div style="--icon-size: {size}">
    <a target="_blank" href="{to}">
        <img src="{icon}" alt="{alt}">
    </a>
</div>

<style>
    img {
        height: var(--icon-size);
        width: var(--icon-size);
    }
</style>