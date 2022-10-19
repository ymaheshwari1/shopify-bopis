<template>
  <div v-show="isStoreLocatorOpened">
    <div id="hc-backdrop" />
    <StoreLocator ref="hcStoreLocator" />
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import StoreLocator from '@/components/StoreLocator.vue'

export default defineComponent({
  name: 'BopisModal',
  components: {
    StoreLocator
  },
  setup() {
    const isStoreLocatorOpened = ref(false);

    return {
      isStoreLocatorOpened
    }
  }
});
</script>