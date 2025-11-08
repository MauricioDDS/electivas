const STORAGE_KEY = "selectedCourses"

export function saveSelectedCourses(courses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses))
}

export function getSelectedCourses() {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

export function clearSelectedCourses() {
  localStorage.removeItem(STORAGE_KEY)
}
