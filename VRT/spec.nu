def main [name:string] {
  let tape_name = $name + ".tape"
  let gif_name = $name + ".gif"
  let png_name = $name + ".png"
  vhs $tape_name
  rm $gif_name
  ^open $png_name
}
