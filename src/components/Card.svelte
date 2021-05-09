<script lang="ts">
    export let title:string; 
    export let content:string;
    export let image_src:string = "";
    export let image_alt:string = "";
    export let text_color:string = "";
</script>

<div style="--text-color: {text_color || 'initial'}" class="card">
    {#if image_src}
        <div class="card-image">
            <img src={image_src} alt={image_alt}>
        </div>
    {/if}
    <div class="card-content center-align">
        <span class="card-title">{@html title}</span>
        <p>{@html content}</p>
    </div>
    
</div>

<style>
    .card {
        position: relative;
        min-height: 500px;
        background-color: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.2)
    }

    .card-content {
        color: var(--text-color)
    }
</style>