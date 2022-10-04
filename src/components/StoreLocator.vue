<template>
  <div class="hc-bopis-modal">
    <div class="hc-modal-content">
      <div class="hc-modal-header">
        <span class="hc-close" @click="closeBopisModal"></span>
        <h1 class="hc-modal-title">Pick up today</h1>
      </div>
      <form>
        <input name="pin" placeholder="Enter zipcode"/>
        <button type="submit" class="btn hc-bopis-pick-up-button">Find Stores</button>
      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'StoreLocator'
});
</script>