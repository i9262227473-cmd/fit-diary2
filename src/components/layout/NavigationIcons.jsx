import React from 'react'

// The five primary destinations deliberately use a single rendered asset family.
function NavAsset({ asset, size = 34 }) {
  return <img src={`/assets/ui-icons-v3/${asset}.png`} width={size} height={size} alt="" draggable="false" />
}

export const NavHome = ({ size }) => <NavAsset asset="home" size={size} />
export const NavFood = ({ size }) => <NavAsset asset="food" size={size} />
export const NavWorkout = ({ size }) => <NavAsset asset="workout" size={size} />
export const NavProgress = ({ size }) => <NavAsset asset="progress" size={size} />
export const NavUser = ({ size }) => <NavAsset asset="profile" size={size} />
