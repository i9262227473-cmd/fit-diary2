export function compressImage(file, maxSize = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = event => {
      const image = new Image()

      image.onload = () => {
        const canvas = document.createElement('canvas')
        let width = image.width
        let height = image.height

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
      }

      image.onerror = reject
      image.src = event.target.result
    }

    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
