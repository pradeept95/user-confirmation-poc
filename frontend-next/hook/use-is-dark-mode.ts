import * as React from "react"

export const useIsDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  React.useEffect(() => {
    const darkModeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setIsDarkMode(darkModeMediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      const newDarkMode = e.matches
      setIsDarkMode(newDarkMode)
    }

    darkModeMediaQuery.addEventListener("change", handleChange)

    return () => {
      darkModeMediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  return isDarkMode
}

export default useIsDarkMode
