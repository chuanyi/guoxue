package main

import (
	"fmt"
	"encoding/json"
	"strings"
	"github.com/gin-gonic/gin"
	"github.com/PuerkitoBio/goquery"
)

func main() {
	 b, err := fetchIndexes("zhs", "yanzi-chun-qiu")
	 fmt.Println(err)
	 fmt.Println(string(b))
	if true {
		return
	}
	
	web := gin.Default()
	gin.SetMode(gin.ReleaseMode)
	api := web.Group("/api")
	api.GET("/books", func(c *gin.Context){
		if out, err := fetchBooks(c.Query("lang")); err == nil {
			c.Data(200, "application/json; charset=utf-8", out)
		} else {
			c.JSON(200, []string{})
		}
	})
	api.GET("/indexes", func(c *gin.Context){
		if out, err := fetchIndexes(c.Query("lang"),c.Query("id")); err == nil {
			c.Data(200, "application/json; charset=utf-8", out)
		} else {
			c.JSON(200, []string{})
		}
	})
	api.GET("/contents", func(c *gin.Context){
		if out, err := fetchContents(c.Query("lang"),c.Query("id")); err == nil {
			c.Data(200, "application/json; charset=utf-8", out)
		} else {
			c.JSON(200, []string{})
		}
	})
	web.Run(":8866")
}

/**
 * fetch contents from ctext.org
 *   support segments and header-titles
 */
func fetchContents(lang, indexID string) (out []byte, err error) {
	return
}

/**
 * fetch indexes from ctext.org
 *   support all normal tree struct,
 *   but yet specials as follows:
 * 1. no index, book->content (OK, return book level index)
 *       儒家->孝经、独断
 *       墨家->鲁胜墨辩注叙
 *       道家->道德经
 *       法家->申不害、谏逐客书
 *       兵家->司马法、三略
 *       算书->海岛算经、孙子算经
 *       杂家->尹文子、邓析子
 *       史书->燕丹子
 *       出土文献->郭店
 *       魏晋南北朝->道德真经注、神异经、洞冥记
 *       隋唐->黄帝阴符经
 *       宋明->三字经
 * 2. no-content index, some index exists but can not click(OK, but only return exists items)
 *       儒家->新书、论衡
 *       墨家->墨子
 *       法家->商君书、管子
 *       杂家->鬼谷子
 *       史书->逸周书、东观汉记、竹书纪年
 *       魏晋南北朝->金楼子
 * 3. four or more depth level index(OK, special handler, TODO...)
 *       史书->晏子春秋
 *       宋明->太平广记
 * 4. none id in href:
 *       儒家->蔡中郎集
 *       魏晋南北朝->水经注、三国志、高士传
 *       隋唐->群书治要、艺文类聚、意林
 *       宋明->广韵
 */
func fetchIndexes(lang, bookID string) (out []byte, err error) {
	type Index struct {
		ID string	`json:"id"`
		Title string `json:"title"`
		Subs []*Index  `json:"subs"`
		Level int `json:"-"`
	}
	root := &Index{ Level:-1, Subs:make([]*Index, 0) }
	subs := []*Index{}
	var doc *goquery.Document
	doc, err = goquery.NewDocument("http://ctext.org/"+bookID+"/"+lang)
	if err != nil {
		return
	}
	count := 0
	selRoot := doc.Find("#content2")
	if len(selRoot.Nodes) <= 0 { // no index, show contents directly
		return []byte("[{\"id\":\""+bookID+"\",\"title\":\"(全文)\",\"subs\":null}]"), nil  
	}
	selRoot.Find("a").Each(func(idx int, s *goquery.Selection){
		href,_ := s.Attr("href")
		if !strings.HasPrefix(href, "http") && strings.HasSuffix(href, "/"+lang) {
			idx := &Index{}
			idx.ID = strings.Replace(href, "/"+lang, "", 1)
			idx.Title = s.Text()
			subs = append(subs, idx)
			count++
			//fmt.Println("a - ",s.Text(), href)
		}
	})
	i := 0
	ready := false
	doc.Find("#searchform").Find("option").Each(func(idx int, s *goquery.Selection){
		if ready {
			i++
			if i <= count {
				subs[i-1].Level = strings.Count(s.Text(), string(160))
				//fmt.Println("t:", subs[i-1].Title,"l:", subs[i-1].Level)
			}
			return
		}
		if _, ok := s.Attr("selected"); ok {
			ready = true
		}
	})

	//fmt.Println("begin ...")
	stack := []*Index{}
	stack = append(stack, root)
	for i,_ := range subs {
		top := stack[len(stack) - 1]
		if subs[i].Level > top.Level {
			top.Subs = append(top.Subs, subs[i])
			stack = append(stack, subs[i])
			//fmt.Println("sub op, top:", top.Title, "sub:", subs[i].Title)
		} else if subs[i].Level == top.Level {
			ref2 := stack[len(stack) - 2]
			ref2.Subs =append(ref2.Subs, subs[i])
			stack = append(stack[:(len(stack)-1)], subs[i])
			//fmt.Println("append op, top:", ref2.Title, "sub:", subs[i].Title)
		} else { // "<"
		    var j = len(stack)-1
			for ; j >= 0; j-- {
				if stack[j].Level <= subs[i].Level {
					break
				}
			}
			stack = stack[:j]
			top = stack[len(stack) - 1]
			if stack[j-1].Level == subs[i].Level {
				ref2 := stack[len(stack) - 2]
				ref2.Subs =append(ref2.Subs, subs[i])
				stack = append(stack[:(len(stack)-1)], subs[i])
				//fmt.Println("up op, top:", ref2.Title, "sub:", subs[i].Title)
			}else{
				top.Subs = append(top.Subs, subs[i])
				stack = append(stack, subs[i])
				//fmt.Println("up op2, top:", top.Title, "sub:", subs[i].Title)
			}
		}
	}
	// step 3 - marshal to json string
	return json.Marshal(root.Subs)
}

/**
 * fetch books from ctext.org
 * 1. fetch root by lang & parse book tree
 *      http://ctext.org/zh
 * 2. fetch desc by lang & parse desc tree
 *      
 */
func fetchBooks(lang string) (out []byte, err error) {
	type Book struct {
		ID string `json:"id"`
		Title string `json:"title"`
		Desc string `json:"desc"`
	}	
	type Cate struct {
		ID string `json:"id"`
		Title string `json:"title"`
		Books []Book `json:"books"`
	}
	all := make([]Cate, 0)
	// step 1 - fetch categories & books tree
	var doc *goquery.Document
	doc, err = goquery.NewDocument("http://ctext.org/" + lang)
	if err != nil {
		return
	}
	first := true
	doc.Find("#menu").Find("span.menuitem").Each(func(idx int, s *goquery.Selection){
		if !first  {
			first_cate := true
	        cat := Cate{}
			s.Find("a.menuitem").Each(func(idx2 int, c *goquery.Selection){
				href, _ := c.Attr("href")
				if first_cate {
					// fmt.Println("cat:"+c.Text()+"-"+href)
					cat.ID = strings.Replace(href, "/"+lang, "", 1)
					cat.Title = c.Text()
					cat.Books = make([]Book, 0)
					first_cate = false
				}else{
					// fmt.Println("book:"+c.Text()+"-"+href)
					book := Book{}
					book.ID = strings.Replace(href, "/"+lang, "", 1)
					book.Title = c.Text()
					cat.Books = append(cat.Books, book)
				}
			})
			all = append(all, cat)
		} else {
			first = false
		}
	})
	// step 2 - fetch book descriptions
	descs := make(map[string]string, 0)
	RELA, START1, START2 := "", "", ""
	if lang == "zhs" {
		RELA, START1, START2 = "相关讨论", "儒家", "魏晋南北朝"
	} else {
		RELA, START1, START2 = "相關討論", "儒家", "魏晉南北朝"
	}
	fill_desc := func(url, start string) {
		curId, ready := "", false
		doc, err = goquery.NewDocument(url+lang)
		if err != nil {
			return
		}
		handle := func(s *goquery.Selection) {
			if s.Text() != RELA {
				if s.Is("a") {
					href, _ := s.Attr("href")
					curId = strings.Replace(href,"/"+lang,"",1)
				} else if s.Is("span") {
					descs[curId] = s.Text()
				}
			}
		}
		doc.Find("#content3").Find("a,span").Each(func(idx int, s *goquery.Selection){
			if ready {
				handle(s)
				return
			}
			if s.Text() == start {
				ready = true
			}
			if ready { 
				handle(s)
			}
		})
	}
	fill_desc("http://ctext.org/pre-qin-and-han/", START1)
	fill_desc("http://ctext.org/post-han/", START2)
	for i, _ := range all {
		for j, _ := range all[i].Books {
			all[i].Books[j].Desc = descs[all[i].Books[j].ID]
		}
	}
	// step 3 - marshal to json string
	return json.Marshal(all)
}