import { useEffect, useMemo, useState } from 'react'
import { Camera, Check, LoaderCircle, ScanLine, X } from 'lucide-react'
import { recognizeBarcodeProduct, saveVerifiedBarcodeFood } from '../../data/sharedFoodApi'
import { compressImage } from '../../utils/image'
import useOnlineStatus from '../../hooks/useOnlineStatus'
import styles from './MissingBarcodeProduct.module.css'

const EMPTY_FORM = { name: '', cal100: '', prot100: '', fat100: '', carbs100: '' }
const NUTRIENTS = [
  ['cal100', 'Калории', 'ккал'],
  ['prot100', 'Белки', 'г'],
  ['fat100', 'Жиры', 'г'],
  ['carbs100', 'Углеводы', 'г'],
]

function PhotoField({ title, description, file, onChange }) {
  const preview = useMemo(() => file ? URL.createObjectURL(file) : '', [file])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  return (
    <label className={`${styles.photoField} ${file ? styles.photoReady : ''}`}>
      {preview ? <img src={preview} alt="" /> : <Camera size={22} />}
      <div><strong>{title}</strong><span>{file?.name || description}</span></div>
      {file && <Check size={18} />}
      <input type="file" accept="image/*" capture="environment" onChange={event => onChange(event.target.files?.[0] || null)} />
    </label>
  )
}

export default function MissingBarcodeProduct({ product, onComplete, onClose }) {
  const [frontFile, setFrontFile] = useState(null)
  const [nutritionFile, setNutritionFile] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM, name: product.suggestion?.name || '' })
  const [stage, setStage] = useState('photos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const online = useOnlineStatus()

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  const recognize = async () => {
    if (!frontFile || !nutritionFile) {
      setError('Добавьте обе фотографии')
      return
    }
    if (!online) {
      setError('Нет соединения с интернетом — распознавание фото недоступно офлайн. Можно заполнить данные вручную.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const [frontB64, nutritionB64] = await Promise.all([
        compressImage(frontFile),
        compressImage(nutritionFile),
      ])
      const data = await recognizeBarcodeProduct(frontB64, nutritionB64)
      setForm({
        name: data.name || product.suggestion?.name || '',
        cal100: String(data.cal100 ?? ''),
        prot100: String(data.prot100 ?? ''),
        fat100: String(data.fat100 ?? ''),
        carbs100: String(data.carbs100 ?? ''),
      })
      setStage('edit')
    } catch (recognitionError) {
      setError(recognitionError.message)
    } finally {
      setLoading(false)
    }
  }

  const save = async event => {
    event.preventDefault()
    const food = {
      name: form.name.trim(),
      cal100: Number(form.cal100),
      prot100: Number(form.prot100),
      fat100: Number(form.fat100),
      carbs100: Number(form.carbs100),
    }
    const numbers = [food.cal100, food.prot100, food.fat100, food.carbs100]

    if (food.name.length < 2) {
      setError('Введите название продукта')
      return
    }
    if (numbers.some(value => !Number.isFinite(value) || value < 0)) {
      setError('Проверьте значения калорий и БЖУ')
      return
    }
    if (!numbers.some(value => value > 0) && !/(^|\s)(вода|water)(\s|$)/i.test(food.name)) {
      setError('Все значения равны нулю. Проверьте фотографию таблицы КБЖУ')
      return
    }
    if (!online) {
      setError('Нет соединения с интернетом — сохранение в общую базу недоступно офлайн. Попробуйте ещё раз, когда появится связь.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const saved = await saveVerifiedBarcodeFood(product.barcode, food)
      onComplete(saved)
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <section className={styles.modal} onClick={event => event.stopPropagation()}>
        <header className={styles.header}>
          <div><span>Штрихкод {product.barcode}</span><h2>Добавить новый продукт</h2></div>
          <button type="button" onClick={onClose} aria-label="Закрыть"><X size={19} /></button>
        </header>

        {stage === 'photos' ? (
          <>
            <div className={styles.intro}>
              <ScanLine size={21} />
              <p>{product.reason === 'incomplete'
                ? 'Продукт найден, но в базе нет надёжных значений КБЖУ. Фотографии помогут заполнить карточку.'
                : 'Этого продукта пока нет в общей базе. Добавьте две фотографии — следующий поиск будет мгновенным.'}</p>
            </div>

            <div className={styles.photos}>
              <PhotoField title="Лицевая сторона" description="Название и бренд продукта" file={frontFile} onChange={file => { setFrontFile(file); setError('') }} />
              <PhotoField title="Таблица КБЖУ" description="Значения на 100 г или 100 мл" file={nutritionFile} onChange={file => { setNutritionFile(file); setError('') }} />
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {!online && <p className={styles.error}>Нет соединения с интернетом — распознавание фото недоступно, но можно заполнить данные вручную.</p>}
            <button className={styles.primary} type="button" onClick={recognize} disabled={loading || !frontFile || !nutritionFile || !online}>
              {loading ? <LoaderCircle className={styles.spin} size={18} /> : <ScanLine size={18} />}
              {loading ? 'Распознаём фотографии' : 'Распознать продукт'}
            </button>
            <button className={styles.textButton} type="button" onClick={() => setStage('edit')}>Заполнить вручную</button>
          </>
        ) : (
          <form onSubmit={save}>
            <p className={styles.verifyText}>Проверьте данные по упаковке перед сохранением в общую базу.</p>
            <label className={styles.nameField}><span>Название продукта</span><input value={form.name} onChange={event => { setForm(current => ({ ...current, name: event.target.value })); setError('') }} autoFocus /></label>

            <div className={styles.nutritionTitle}><strong>На 100 г или 100 мл</strong><span>Исправьте неточные значения</span></div>
            <div className={styles.nutrients}>
              {NUTRIENTS.map(([key, label, unit]) => (
                <label key={key}>
                  <span>{label}</span>
                  <div><input type="number" inputMode="decimal" min="0" step="0.1" value={form[key]} onChange={event => { setForm(current => ({ ...current, [key]: event.target.value })); setError('') }} /><small>{unit}</small></div>
                </label>
              ))}
            </div>

            {error && <p className={styles.error}>{error}</p>}
            {!online && <p className={styles.error}>Нет соединения с интернетом — сохранить в общую базу можно будет, когда появится связь.</p>}
            <button className={styles.primary} type="submit" disabled={loading || !online}>
              {loading ? <LoaderCircle className={styles.spin} size={18} /> : <Check size={18} />}
              {loading ? 'Сохраняем' : 'Подтвердить и сохранить'}
            </button>
            <button className={styles.textButton} type="button" onClick={() => { setStage('photos'); setError('') }}>Вернуться к фотографиям</button>
          </form>
        )}
      </section>
    </div>
  )
}
