<template>
  <div>
    <div id="hc-backdrop" v-show="isStoreLocatorOpened" />
    <StoreLocator ref="hcStoreLocator" v-show="isStoreLocatorOpened"/>
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