package main

import (
	"encoding/json"
	"strings"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/PuerkitoBio/goquery"
)

type Index struct {
	Title string
	URL string
	Indexes []Index
}

/*
 * using stack to implement:
 * http://www.cnblogs.com/chinabrle/p/3541993.html
 * http://outofmemory.cn/code-snippet/8358/Go-stack
 */
func fetchIndexes2() {
	doc, err := goquery.NewDocument("http://ctext.org/kongcongzi/zhs")
	if err == nil {
		count := 0
		doc.Find("#content2").Find("a").Each(func(idx int, s *goquery.Selection){
			href,_ := s.Attr("href")
			if strings.HasSuffix(href, "/zhs") {
				fmt.Println(s.Text()+"-"+href)
				count++
			}
		})
		i := 0
		ready := false
		doc.Find("#searchform").Find("option").Each(func(idx int, s *goquery.Selection){
			if ready {
				i++
				if i <= count {
					fmt.Println(s.Text())
				}
				return
			}
			if _, ok := s.Attr("selected"); ok {
				ready = true
			}
		})
	}else{
		fmt.Println("fetch fail:"+err.Error())
	}
}

func main() {
	web := gin.Default()
	api := web.Group("/api")
	api.GET("/books", func(c *gin.Context){
		if out, err := fetchBooks(c.Query("lang")); err == nil {
			c.JSON(200, gin.H{"code":0,"msg":"", "data":out})
		} else {
			c.JSON(200, gin.H{"code":1,"msg":err.Error()})
		}
	})
	api.GET("/indexes", func(c *gin.Context){
		if out, err := fetchIndexes(c.Query("lang"),c.Query("id")); err == nil {
			c.JSON(200, gin.H{"code":0,"msg":"", "data":out})
		} else {
			c.JSON(200, gin.H{"code":1,"msg":err.Error()})
		}
	})
	api.GET("/contents", func(c *gin.Context){
		if out, err := fetchContents(c.Query("lang"),c.Query("id")); err == nil {
			c.JSON(200, gin.H{"code":0,"msg":"", "data":out})
		} else {
			c.JSON(200, gin.H{"code":1,"msg":err.Error()})
		}
	})
	web.Run(":8888")
}

/**
 * fetch contents from ctext.org
 */
func fetchContents(lang, indexID string) (out string, err error) {
	return
}

/**
 * fetch indexes from ctext.org
 * special handler:
 * 1. no index, book->content
 * 2. multi-level, index->subindex
 * 3. no-content index, some index exists but can not click
 * 4. four depth level index (晏子春秋(yanzi-chun-qiu/zh))
 */
func fetchIndexes(lang, bookID string) (out string, err error) {
	return
}

/**
 * fetch books from ctext.org
 * 1. fetch root by lang & parse book tree
 *      http://ctext.org/zh
 * 2. fetch desc by lang & parse desc tree
 *      
 */
func fetchBooks(lang string) (out string, err error) {
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
	b, _ := json.Marshal(all)
	return string(b), nil
}