<script lang="ts">
  const webhook = {
    base: "https://discord.com/api/webhooks/",
    id: "848198980553932830/mqkPJZ3FAlobu763xJte4dMBePSCrhGp9F4TpksgU6_QdE3thiZU6qPFNn5r3XEaG2lH"
  }
  let trap = false;
  let name = "";
  let email = "";
  let telephone = "";
  let message = "";

  function process():void {
    if(trap) return;
    if(message.length > 1850) message = message.slice(0, 1850)
    
    fetch(`${webhook.base}${webhook.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: `**${name || "John Doe"} ─ ${email || "johndoe@email.com"} ─ ${telephone || "+000000000000"}**\n${message || "No busco nada"}`
      })
    }).then(() => window.location.reload())

  }
</script>

<div class="center">
  <h3>Conversemos</h3>
</div>
<div class="row">
  <form on:submit|preventDefault={process} class="col s12 l8 offset-l2">

    <div class="row">
      <div class="input-field col s12">
        <input required id="name" type="text" class="validate" bind:value={name}>
        <label for="name">Nombre</label>
      </div>
    </div>

    <!-- input oculto -->
    <div class="row trap">
      <div class="input-field col s12">
        <label>
          <input type="checkbox" bind:checked={trap}/>
          <span>Contact me</span>
        </label>
      </div>
    </div>

    <div class="row">
      <div class="input-field col s12">
        <input required id="email" type="email" class="validate" bind:value={email}>
        <label for="email">Email</label>
      </div>
    </div>

    <div class="row">
      <div class="input-field col s12">
        <input id="telephone" type="tel" class="validate" bind:value={telephone}>
        <label for="telephone">Teléfono</label>
      </div>
    </div>

    <div class="row">
      <div class="input-field col s12">
        <textarea maxlength="1850" required name="message" id="message" class="materialize-textarea" bind:value={message}></textarea>
        <label for="message">Mensaje</label>
      </div>
    </div>

    <div class="row">
      <input style="color: #fff7f2; background-color: #669fa4" type="submit" value="Enviar" class="col s6 btn offset-s3">
    </div>
  </form>
</div>

<style>
  .trap {
    display: none;
  }

  /* Esta es la cajita de los inputs*/
  input:not([type]), input[type="text"]:not(.browser-default), input[type="email"]:not(.browser-default),  input[type="tel"]:not(.browser-default), textarea.materialize-textarea {
    background-color: rgba(0, 0, 0, 0.025);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 2px;
    padding-left: 0.75rem;
  }

  /* Este es el label que está dentro del input*/
  .input-field.col label {
    left: 1.5rem;
  }

  textarea.materialize-textarea {
    min-height: 6rem;
  }

</style>